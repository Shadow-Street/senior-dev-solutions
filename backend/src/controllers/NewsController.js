const db = require('../models');
const { FinDataService } = require('../services/FinDataService');
const Marketaux = require('../services/MarketauxService');
const { createCrudController } = require('../utils/crudController');

// Create base CRUD controller
const baseController = createCrudController(db.News, {
    defaultOrderBy: 'published_at',
    defaultOrder: 'DESC'
});

/** Marketaux article -> the flat shape the dashboard card and older callers read. */
const toLegacyArticle = (a) => ({
    id: a.id,
    title: a.title,
    summary: a.description || a.snippet || '',
    category: a.entities.find(e => e.industry)?.industry || 'market',
    source: a.source,
    url: a.url,
    image_url: a.image_url,
    published_at: a.published_at,
    sentiment: a.sentiment,
    stock_symbols: a.entities.map(e => e.symbol),
});

/** Map service errors to a status and a generic client message. */
const sendNewsError = (res, err) => {
    if (err instanceof Marketaux.NewsQueryError) {
        return res.status(400).json({ error: err.message });
    }
    if (err instanceof Marketaux.NewsAuthRequiredError) {
        return res.status(401).json({ error: err.message, code: 'login_required' });
    }
    if (err instanceof Marketaux.NewsUpstreamError) {
        return res.status(err.status).json({ error: 'News is temporarily unavailable. Please try again shortly.', code: 'news_unavailable' });
    }
    console.error('[NewsController] unexpected error:', err && err.name);
    return res.status(500).json({ error: 'Internal server error' });
};

const NewsController = {
    ...baseController,

    /**
     * GET /api/news/feed - Indian market news from Marketaux.
     *
     * Always HTTP 200 when the request is valid, including when the server has
     * no MARKETAUX_API_KEY: the body is then `{ configured: false, articles: [] }`
     * so the page can show a "feed not configured" state without treating it as
     * a failure. 400 = bad query, 503 = quota exhausted, 502 = provider error.
     */
    async getFeed(req, res) {
        try {
            const result = await Marketaux.fetchNews(req.query, { authenticated: Boolean(req.user) });
            res.set('Cache-Control', 'private, max-age=60');
            return res.json(result);
        } catch (err) {
            return sendNewsError(res, err);
        }
    },

    /** GET /api/news/stock/:symbol - per-stock news, Marketaux when configured. */
    async getStockNews(req, res) {
        const symbol = String(req.params.symbol || '').trim().toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9.&_^-]{0,19}$/.test(symbol)) {
            return res.status(400).json({ error: 'invalid symbol' });
        }
        try {
            if (Marketaux.isConfigured()) {
                // Bare tickers are assumed to be NSE listings.
                const marketauxSymbol = symbol.includes('.') || symbol.startsWith('^') ? symbol : `${symbol}.NS`;
                // Per-symbol queries are free-form, so anonymous callers only
                // get what is already cached (401 otherwise).
                const result = await Marketaux.fetchNews({ symbols: marketauxSymbol }, { authenticated: Boolean(req.user) });
                res.set('X-News-Source', 'marketaux');
                return res.json(result.articles.map(toLegacyArticle));
            }
            const news = await db.News.findAll({
                where: {
                    status: 'published',
                    [db.Sequelize.Op.or]: [
                        { stock_symbols: { [db.Sequelize.Op.like]: `%${symbol}%` } },
                        { tags: { [db.Sequelize.Op.like]: `%${symbol}%` } }
                    ]
                },
                order: [['published_at', 'DESC']],
                limit: 20
            });
            res.set('X-News-Source', 'legacy');
            return res.json(news);
        } catch (err) {
            if (err instanceof Marketaux.NewsQueryError || err instanceof Marketaux.NewsUpstreamError
                || err instanceof Marketaux.NewsAuthRequiredError) {
                return sendNewsError(res, err);
            }
            console.error('[NewsController] stock news failed:', err && err.name);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Override or add new methods
    async getLatestNews(req, res) {
        // Marketaux (Indian market news) is the primary source. When it is not
        // configured the original Finnhub (US general news) + DB path below is
        // kept as a labelled fallback (X-News-Source: legacy) so the dashboard
        // card is not blank. `category` is a Finnhub concept and is ignored here.
        if (Marketaux.isConfigured()) {
            try {
                // One canonical upstream query for everyone (so the dashboard
                // card never costs more than one cached request); the caller's
                // `limit` only trims the response.
                const want = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
                const result = await Marketaux.fetchNews({}, { authenticated: Boolean(req.user) });
                res.set('X-News-Source', 'marketaux');
                return res.json(result.articles.slice(0, want).map(toLegacyArticle));
            } catch (err) {
                console.error('[NewsController] Marketaux latest failed, using fallback');
            }
        }
        res.set('X-News-Source', 'legacy');
        try {
            const { limit = 20, category } = req.query;

            // Finnhub only publishes: general | forex | crypto | merger.
            // Callers asking for anything else (e.g. 'business') get general.
            const FINNHUB_CATEGORIES = ['general', 'forex', 'crypto', 'merger'];
            const resolvedCategory = FINNHUB_CATEGORIES.includes(category) ? category : 'general';

            // 1. Fetch from External API
            const externalNews = await FinDataService.fetchLatestNews(resolvedCategory);

            // 2. Save to DB (optional, but good for persistence/history)
            if (externalNews && externalNews.length > 0) {
                for (const article of externalNews) {
                    // Use title as unique identifier since 'url' column doesn't exist in DB
                    await db.News.findOrCreate({
                        where: { title: article.title },
                        defaults: {
                            title: article.title,
                            content: article.summary || '', // Fallback for content
                            summary: article.summary,
                            category: resolvedCategory,
                            source: article.source,
                            url: article.url,
                            image_url: article.image_url,
                            published_at: article.published_at,
                            status: 'published',
                            views_count: 0
                        }
                    });
                }
            }

            // 3. Fetch from DB to return consistent format and include any manually added news
            const where = { status: 'published' };
            if (category && FINNHUB_CATEGORIES.includes(category)) {
                where.category = category;
            }

            const news = await db.News.findAll({
                where,
                order: [['published_at', 'DESC']],
                limit: parseInt(limit)
            });

            res.json(news);

        } catch (error) {
            console.error('News fetch error:', error);
            // Fallback to whatever is in DB
            try {
                const news = await db.News.findAll({
                    where: { status: 'published' },
                    order: [['published_at', 'DESC']],
                    limit: 10
                });
                res.json(news);
            } catch (dbError) {
                res.status(500).json({ error: 'Failed to fetch news' });
            }
        }
    }
};

module.exports = NewsController;
