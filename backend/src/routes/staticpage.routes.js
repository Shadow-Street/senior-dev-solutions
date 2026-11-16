const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Static Pages CRUD
const staticPageController = createCrudController(db.StaticPage);

// Get page by slug (public)
router.get('/slug/:slug', async (req, res) => {
  try {
    const page = await db.StaticPage.findOne({
      where: { slug: req.params.slug, status: 'published' }
    });
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('[staticpage.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all published pages (public)
router.get('/published', async (req, res) => {
  try {
    const pages = await db.StaticPage.findAll({
      where: { status: 'published' },
      attributes: ['id', 'slug', 'title', 'meta_title', 'meta_description'],
      order: [['title', 'ASC']]
    });
    res.json(pages);
  } catch (error) {
    console.error('[staticpage.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Admin-edited legal pages (Platform Settings > Static Pages).
 *
 * A fixed set of slugs, each backing one public page. While a slug has a
 * *published* row its text replaces the built-in page; draft or absent means
 * the built-in page is shown. Content is plain text (the page renders it as
 * text, never as HTML), so there is nothing to sanitise and nothing to inject.
 */
const PlatformSettings = require("../services/PlatformSettingsService");

const MANAGED_PAGES = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  cookies: 'Cookie Policy',
  'risk-disclosure': 'Risk Disclosure',
};
const MAX_CONTENT = 100000;

router.get('/managed', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const rows = await db.StaticPage.findAll({ where: { slug: { [db.Sequelize.Op.in]: Object.keys(MANAGED_PAGES) } } });
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    res.set('Cache-Control', 'no-store');
    res.json(Object.entries(MANAGED_PAGES).map(([slug, defaultTitle]) => {
      const row = bySlug.get(slug);
      return {
        slug,
        default_title: defaultTitle,
        title: (row && row.title) || defaultTitle,
        content: row ? row.content || '' : '',
        status: row ? row.status || 'draft' : 'draft',
        published_at: row ? row.published_at || null : null,
        updated_at: row ? row.updated_at || null : null,
      };
    }));
  } catch (error) {
    console.error('[staticpage.routes.js] managed list failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/managed/:slug', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    if (!Object.prototype.hasOwnProperty.call(MANAGED_PAGES, slug)) {
      return res.status(404).json({ error: 'Unknown page' });
    }
    const body = req.body || {};
    const fields = {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.replace(/\r\n/g, '\n') : '';
    const status = body.status;
    if (!title || title.length > 200) fields.title = 'Title is required (200 characters or fewer)';
    if (content.length > MAX_CONTENT) fields.content = `Content must be ${MAX_CONTENT} characters or fewer`;
    if (status !== 'published' && status !== 'draft') fields.status = 'Status must be published or draft';
    if (status === 'published' && content.trim().length < 50) fields.content = 'Published content must be at least 50 characters';
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Some fields are invalid', fields });

    const rows = await db.StaticPage.findAll({ where: { slug } });
    const before = rows[0] ? { title: rows[0].title, status: rows[0].status, content_length: (rows[0].content || '').length } : null;
    const patch = {
      title,
      content,
      status,
      published_at: status === 'published' ? new Date() : (rows[0] ? rows[0].published_at : null),
      updated_at: new Date(),
    };
    let page;
    if (rows.length) {
      for (const row of rows) await row.update(patch);
      page = rows[0];
    } else {
      page = await db.StaticPage.create({ slug, ...patch });
    }

    await PlatformSettings.writeAudit({
      user: req.user, req, action: 'static_page_updated',
      oldData: before,
      newData: { title, status, content_length: content.length },
      description: `Static page "${slug}" saved as ${status}`,
    });
    res.json({ slug, title: page.title, content: page.content, status: page.status, published_at: page.published_at, updated_at: page.updated_at });
  } catch (error) {
    console.error('[staticpage.routes.js] managed save failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generic list/get return every row, drafts included, so they are staff-only;
// the public reads are /slug/:slug and /published above (published only).
createCrudRoutes(router, staticPageController, { read: [authMiddleware, adminMiddleware], write: [authMiddleware, adminMiddleware] });

module.exports = router;
