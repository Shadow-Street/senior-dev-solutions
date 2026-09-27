const db = require('../models');
const { FinDataService } = require('../services/FinDataService');
const { createCrudController } = require('../utils/crudController');

// Create base CRUD controller
const baseController = createCrudController(db.News, {
    defaultOrderBy: 'published_at',
    defaultOrder: 'DESC'
});

const NewsController = {
    ...baseController,

    // Override or add new methods
    async getLatestNews(req, res) {
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
