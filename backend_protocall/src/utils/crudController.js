// Generic CRUD Controller Factory
// Creates standard CRUD operations for any model

const createCrudController = (Model, options = {}) => {
  const { 
    searchFields = [],
    defaultOrderBy = 'created_at',
    defaultOrder = 'DESC',
    beforeCreate,
    afterCreate,
    beforeUpdate,
    afterUpdate,
    beforeDelete,
    afterDelete,
    customFilters
  } = options;

  return {
    // List all records with pagination and filtering
    async list(req, res) {
      try {
        const { limit = 100, offset = 0, ...filters } = req.query;
        
        const where = {};
        
        // Apply custom filters if provided
        if (customFilters) {
          Object.assign(where, customFilters(filters, req));
        } else {
          // Default filter handling
          Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== '') {
              where[key] = filters[key];
            }
          });
        }

        const records = await Model.findAll({
          where,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [[defaultOrderBy, defaultOrder]]
        });

        res.json(records);
      } catch (error) {
        console.error(`Error listing ${Model.name}:`, error);
        res.status(500).json({ error: error.message });
      }
    },

    // Get single record by ID
    async get(req, res) {
      try {
        const { id } = req.params;
        const record = await Model.findByPk(id);
        
        if (!record) {
          return res.status(404).json({ error: 'Record not found' });
        }
        
        res.json(record);
      } catch (error) {
        console.error(`Error getting ${Model.name}:`, error);
        res.status(500).json({ error: error.message });
      }
    },

    // Create new record
    async create(req, res) {
      try {
        let data = { ...req.body };
        
        // Add user_id if authenticated
        if (req.user && !data.user_id) {
          data.user_id = req.user.id;
        }

        // Before create hook
        if (beforeCreate) {
          data = await beforeCreate(data, req);
        }

        const record = await Model.create(data);

        // After create hook
        if (afterCreate) {
          await afterCreate(record, req);
        }

        res.status(201).json(record);
      } catch (error) {
        console.error(`Error creating ${Model.name}:`, error);
        res.status(500).json({ error: error.message });
      }
    },

    // Update existing record
    async update(req, res) {
      try {
        const { id } = req.params;
        let data = { ...req.body };

        const record = await Model.findByPk(id);
        
        if (!record) {
          return res.status(404).json({ error: 'Record not found' });
        }

        // Before update hook
        if (beforeUpdate) {
          data = await beforeUpdate(data, record, req);
        }

        await record.update(data);

        // After update hook
        if (afterUpdate) {
          await afterUpdate(record, req);
        }

        res.json(record);
      } catch (error) {
        console.error(`Error updating ${Model.name}:`, error);
        res.status(500).json({ error: error.message });
      }
    },

    // Delete record
    async delete(req, res) {
      try {
        const { id } = req.params;
        
        const record = await Model.findByPk(id);
        
        if (!record) {
          return res.status(404).json({ error: 'Record not found' });
        }

        // Before delete hook
        if (beforeDelete) {
          await beforeDelete(record, req);
        }

        await record.destroy();

        // After delete hook
        if (afterDelete) {
          await afterDelete(id, req);
        }

        res.json({ success: true, message: 'Record deleted successfully' });
      } catch (error) {
        console.error(`Error deleting ${Model.name}:`, error);
        res.status(500).json({ error: error.message });
      }
    },

    // Bulk operations
    async bulkCreate(req, res) {
      try {
        const records = await Model.bulkCreate(req.body, { returning: true });
        res.status(201).json(records);
      } catch (error) {
        console.error(`Error bulk creating ${Model.name}:`, error);
        res.status(500).json({ error: error.message });
      }
    },

    async bulkUpdate(req, res) {
      try {
        const { ids, data } = req.body;
        await Model.update(data, { where: { id: ids } });
        const records = await Model.findAll({ where: { id: ids } });
        res.json(records);
      } catch (error) {
        console.error(`Error bulk updating ${Model.name}:`, error);
        res.status(500).json({ error: error.message });
      }
    },

    async bulkDelete(req, res) {
      try {
        const { ids } = req.body;
        await Model.destroy({ where: { id: ids } });
        res.json({ success: true, message: 'Records deleted successfully' });
      } catch (error) {
        console.error(`Error bulk deleting ${Model.name}:`, error);
        res.status(500).json({ error: error.message });
      }
    }
  };
};

// Create standard CRUD routes for Express router
const createCrudRoutes = (router, controller, middleware = []) => {
  router.get('/', ...middleware, controller.list);
  router.get('/:id', ...middleware, controller.get);
  router.post('/', ...middleware, controller.create);
  router.put('/:id', ...middleware, controller.update);
  router.delete('/:id', ...middleware, controller.delete);
  
  // Optional bulk operations
  if (controller.bulkCreate) {
    router.post('/bulk', ...middleware, controller.bulkCreate);
  }
  if (controller.bulkUpdate) {
    router.put('/bulk', ...middleware, controller.bulkUpdate);
  }
  if (controller.bulkDelete) {
    router.delete('/bulk', ...middleware, controller.bulkDelete);
  }
  
  return router;
};

module.exports = { createCrudController, createCrudRoutes };