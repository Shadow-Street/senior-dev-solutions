
// Generic CRUD Controller Factory
// Creates standard CRUD operations for any model


const { Op } = require('sequelize');

// Helper: convert query string to proper JS type
const parseValue = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!isNaN(value) && value !== '') return Number(value);
  return value;
};


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
    customFilters,
    include = [], // Added include option

    /**
     * Row-level ownership.
     *
     *   ownership: 'user_id'                      // shorthand
     *   ownership: { field: 'user_id', adminRoles: [...] }
     *
     * When set, every operation is confined to rows the caller owns:
     *   list/query  -> WHERE <field> = req.user.id
     *   get/update/delete -> 404 unless the row belongs to the caller
     *   create      -> <field> is forced to req.user.id (client value ignored)
     *
     * Staff roles bypass the confinement so admin screens keep working.
     * A request with no authenticated user is refused outright: failing open
     * here would expose every row in the table.
     */
    ownership = null,

    /**
     * Fields only staff may write.
     *
     *   protectedFields: ['status', 'verified']
     *
     * Non-staff values for these keys are stripped from create and update
     * payloads. This is what separates "the applicant submits their details"
     * from "an administrator approves them": without it, any caller who can
     * create a row can also mark it approved and verified in the same request.
     *
     * Stripped rather than rejected, so a client that echoes a whole record
     * back on save does not get a confusing 403 for fields it never changed.
     */
    protectedFields = [],

    /**
     * Group-membership scoping, for rows that belong to a room or engagement
     * rather than to one person.
     *
     *   scope: {
     *     listWhere: async (req) => ({ chat_room_id: { [Op.in]: [...] } }),
     *     allows:    async (req, record) => boolean,
     *   }
     *
     * `ownership` answers "is this row mine"; plenty of data is legitimately
     * shared — a chat message belongs to everyone in the room — so scoping it
     * by user_id would hide other people's messages and break the feature.
     * This hook expresses the real rule instead. Staff bypass it, and a hook
     * that throws is treated as "deny", never as "allow".
     */
    scope = null,
  } = options;

  /**
   * Columns no read may ever return.
   *
   * GET /api/users/:id went through this generic controller and happily
   * serialised the bcrypt `password` column, so any authenticated caller could
   * harvest another account's hash and attack it offline. Excluding the
   * sensitive names here fixes every model that uses this factory at once,
   * rather than relying on each route to remember.
   *
   * Only names the model actually defines are passed to Sequelize, since
   * excluding an unknown attribute throws.
   */
  const SENSITIVE_ATTRIBUTES = [
    'password', 'password_hash', 'reset_token', 'refresh_token',
    'two_factor_secret', 'api_secret',
  ];

  const hiddenAttributes = SENSITIVE_ATTRIBUTES.filter(
    (name) => name in (Model.rawAttributes || {})
  );

  /** Strips sensitive columns from a record before it is serialised. */
  const sanitiseRecord = (record) => {
    if (!record || !hiddenAttributes.length) return record;
    const plain = typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
    for (const name of hiddenAttributes) delete plain[name];
    return plain;
  };

  /** Read options that keep sensitive columns out of the response. */
  const safeAttributes = hiddenAttributes.length
    ? { exclude: hiddenAttributes }
    : undefined;

  const DEFAULT_ADMIN_ROLES = ['admin', 'super_admin', 'sub_admin'];
  const ownershipConfig = ownership
    ? (typeof ownership === 'string'
        ? { field: ownership, adminRoles: DEFAULT_ADMIN_ROLES, resolveOwnerId: null, publicRead: false }
        : {
            field: ownership.field || 'user_id',
            adminRoles: ownership.adminRoles || DEFAULT_ADMIN_ROLES,
            // Maps the caller to the value stored in `field`. Defaults to the
            // user's own id; supply one for indirectly-owned resources.
            resolveOwnerId: ownership.resolveOwnerId || null,
            // Some collections are meant to be browsable by anyone (public
            // advisor profiles, plan catalogues) while writes stay restricted.
            publicRead: Boolean(ownership.publicRead),
          })
    : null;

  const PROTECTED = new Set(protectedFields);

  /** Drops staff-only fields from a non-staff payload. */
  const stripProtected = (data, req) => {
    if (!PROTECTED.size || isStaff(req)) return data;
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (!PROTECTED.has(k)) out[k] = v;
    }
    return out;
  };

  /** The id this caller's rows are keyed by, or null when it cannot be resolved. */
  const ownerIdFor = async (req) => {
    if (!ownershipConfig) return null;
    if (!ownershipConfig.resolveOwnerId) return req.user?.id ?? null;
    try {
      return await ownershipConfig.resolveOwnerId(req);
    } catch {
      return null;
    }
  };

  // Staff detection must not depend on `ownership` being configured. It used
  // to start with Boolean(ownershipConfig), so a controller scoped by the
  // `scope` hook alone — no ownership field — reported every caller as
  // non-staff. Two documented guarantees quietly failed there: staff did not
  // bypass the scope (an admin could not read back a record they had just
  // created), and `protectedFields` were stripped from staff writes too, so
  // the one role allowed to set a status could not set it.
  const STAFF_ROLES = ownershipConfig?.adminRoles || DEFAULT_ADMIN_ROLES;
  const isStaff = (req) =>
    STAFF_ROLES.includes(req.user?.app_role || req.user?.role);

  /** Returns an error response when the caller may not act, else null. */
  const denyUnauthenticated = (req, res, { allowPublic = false } = {}) => {
    if (!ownershipConfig) return null;
    if (allowPublic && ownershipConfig.publicRead) return null;
    if (!req.user?.id) {
      res.status(401).json({ error: 'Authentication required' });
      return true;
    }
    return null;
  };

  /**
   * Extra WHERE clause confining a listing to the caller's own rows.
   * An unresolvable owner yields an impossible clause rather than no clause,
   * so a failed lookup can never widen access.
   */
  const ownershipWhere = async (req) => {
    if (!ownershipConfig || isStaff(req)) return {};
    const ownerId = await ownerIdFor(req);
    return { [ownershipConfig.field]: ownerId ?? '__no_owner__' };
  };

  /** True when the caller may touch this specific record. */
  const ownsRecord = async (req, record) => {
    if (isStaff(req)) return true;

    // A scope hook, when present, is the authority for this record.
    if (scope?.allows) {
      try {
        if (!(await scope.allows(req, record))) return false;
      } catch {
        return false; // fail closed
      }
      if (!ownershipConfig) return true;
    }

    if (!ownershipConfig) return true;
    const ownerId = await ownerIdFor(req);
    if (!ownerId) return false;
    return String(record?.[ownershipConfig.field] ?? '') === String(ownerId);
  };

  return {
    // List all records with pagination and filtering
   async list(req, res) {
      try {
        if (denyUnauthenticated(req, res, { allowPublic: true })) return;

        const { limit = 100, offset = 0, ...rawFilters } = req.query;

        // Coerce paging defensively. Number("abc") is NaN, which Sequelize
        // interpolated straight into "LIMIT 0, NaN" — any client could turn a
        // list endpoint into a 500 with ?limit=abc. Also cap the page size so a
        // single request cannot ask for the whole table.
        const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 200);
        const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);

        const where = {};

        // Only real columns may reach the WHERE clause. An unknown key used to
        // reach Sequelize and throw a 500 whose message leaked the schema
        // ("Unknown column 'x.y' in 'where clause'"); unknown keys are now
        // ignored instead.
        // Real columns only — VIRTUAL fields (created_date/updated_date) have
        // no SQL counterpart and would break the query.
        const columns = new Set(
          Object.entries(Model.rawAttributes || {})
            .filter(([, def]) => String(def?.type?.key || def?.type) !== 'VIRTUAL')
            .map(([name]) => name)
        );
        const ignored = [];

        if (customFilters) {
          Object.assign(where, customFilters(rawFilters, req));
        } else {
          for (const key of Object.keys(rawFilters)) {
            const value = rawFilters[key];

            if (value === undefined || value === '') continue;
            if (!columns.has(key)) { ignored.push(key); continue; }

            where[key] = parseValue(value);
          }
        }

        if (ignored.length) {
          console.warn(
            `[${Model.name}] ignoring unknown filter(s): ${ignored.join(', ')}`
          );
        }

        // Ownership is applied last so a client-supplied filter cannot widen it.
        // Public-read collections are browsable; writes remain restricted.
        if (!ownershipConfig?.publicRead) {
          Object.assign(where, await ownershipWhere(req));
        }

        // Membership scoping, same principle: applied after client filters so
        // a crafted query cannot escape it, and failing closed on error.
        if (scope?.listWhere && !isStaff(req)) {
          let clause;
          try {
            clause = await scope.listWhere(req);
          } catch (e) {
            console.error(`[${Model.name}] scope.listWhere failed:`, e.message);
            return res.status(403).json({ error: 'Not permitted' });
          }
          Object.assign(where, clause || {});
        }

        const records = await Model.findAll({
          where,
          limit: safeLimit,
          offset: safeOffset,
          order: [[defaultOrderBy, defaultOrder]],
          include,
          attributes: safeAttributes,
        });

        res.json(records);
      } catch (error) {
        console.error(`Error listing ${Model.name}:`, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    // Get single record by ID
    async get(req, res) {
      try {
        if (denyUnauthenticated(req, res, { allowPublic: true })) return;

        const { id } = req.params;
        // The ownership check needs the whole row, so it is fetched intact and
        // the sensitive columns are removed from the response below.
        const record = await Model.findByPk(id);

        // 404 rather than 403 for a row the caller does not own: a 403 would
        // confirm the id exists and let an attacker enumerate records.
        const mayRead = ownershipConfig?.publicRead ? Boolean(record) : await ownsRecord(req, record);
        if (!record || !mayRead) {
          return res.status(404).json({ error: 'Record not found' });
        }

        res.json(sanitiseRecord(record));
      } catch (error) {
        console.error(`Error getting ${Model.name}:`, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    // Create new record
    async create(req, res) {
      try {
        if (denyUnauthenticated(req, res)) return;

        let data = { ...req.body };

        // Add user_id if authenticated
        if (req.user && !data.user_id) {
          data.user_id = req.user.id;
        }

        // Owned rows are stamped server-side; a client cannot create a record
        // on another user's behalf (staff may, e.g. an admin raising a record).
        if (ownershipConfig && !isStaff(req)) {
          const ownerId = await ownerIdFor(req);
          if (!ownerId) {
            return res.status(403).json({ error: 'You do not have permission to create this record' });
          }
          data[ownershipConfig.field] = ownerId;
        }

        // Privilege fields (approval status, verification flags, trust metrics)
        // are never taken from an untrusted payload.
        data = stripProtected(data, req);

        // Before create hook
        if (beforeCreate) {
          data = await beforeCreate(data, req);
        }

        const record = await Model.create(data);

        // After create hook
        if (afterCreate) {
          await afterCreate(record, req);
        }

        res.status(201).json(sanitiseRecord(record));
      } catch (error) {
        console.error(`Error creating ${Model.name}: `, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    // Update existing record
    async update(req, res) {
      try {
        if (denyUnauthenticated(req, res)) return;

        const { id } = req.params;
        let data = { ...req.body };

        const record = await Model.findByPk(id);

        if (!record || !(await ownsRecord(req, record))) {
          return res.status(404).json({ error: 'Record not found' });
        }

        // The owner column is immutable from the client: without this a user
        // could reassign their own row to another account, or steal one.
        if (ownershipConfig && !isStaff(req)) {
          delete data[ownershipConfig.field];
        }

        // Same privilege-field rule as create: an owner may edit their own
        // details but cannot approve or verify themselves.
        data = stripProtected(data, req);

        // Before update hook
        if (beforeUpdate) {
          data = await beforeUpdate(data, record, req);
        }

        await record.update(data);

        // After update hook
        if (afterUpdate) {
          await afterUpdate(record, req);
        }

        res.json(sanitiseRecord(record));
      } catch (error) {
        console.error(`Error updating ${Model.name}: `, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    // Delete record
    async delete(req, res) {
      try {
        if (denyUnauthenticated(req, res)) return;

        const { id } = req.params;

        const record = await Model.findByPk(id);

        if (!record || !(await ownsRecord(req, record))) {
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
        console.error(`Error deleting ${Model.name}: `, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    // Bulk operations
    async bulkCreate(req, res) {
      try {
        const records = await Model.bulkCreate(req.body, { returning: true });
        res.status(201).json(records);
      } catch (error) {
        console.error(`Error bulk creating ${Model.name}: `, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    async bulkUpdate(req, res) {
      try {
        const { ids, data } = req.body;
        await Model.update(data, { where: { id: ids } });
        const records = await Model.findAll({ where: { id: ids } });
        res.json(records);
      } catch (error) {
        console.error(`Error bulk updating ${Model.name}: `, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    async bulkDelete(req, res) {
      try {
        const { ids } = req.body;
        await Model.destroy({ where: { id: ids } });
        res.json({ success: true, message: 'Records deleted successfully' });
      } catch (error) {
        console.error(`Error bulk deleting ${Model.name}: `, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

// Create standard CRUD routes for Express router
/**
 * Registers list/get/create/update/delete on `router`.
 *
 * `middleware` is either an array applied to every method, or
 * `{ read: [...], write: [...] }` when reads and writes differ — a public
 * catalogue whose writes are restricted to staff being the common case.
 *
 * Note: any controller configured with `ownership` needs req.user populated,
 * so such a router must always carry `authenticate` (or `optionalAuthenticate`
 * when reads are public). Giving it ownership without one makes every request
 * fail closed with 401.
 */
const createCrudRoutes = (router, controller, middleware = []) => {
  const read = Array.isArray(middleware) ? middleware : (middleware.read || []);
  const write = Array.isArray(middleware) ? middleware : (middleware.write || []);
  // `create` defaults to the write chain; it is split out only for public
  // intake endpoints (a contact form anyone may submit but only staff may read).
  const create = Array.isArray(middleware)
    ? middleware
    : (middleware.create || middleware.write || []);

  router.get('/', ...read, controller.list);
  router.get('/:id', ...read, controller.get);
  router.post('/', ...create, controller.create);
  router.put('/:id', ...write, controller.update);
  router.delete('/:id', ...write, controller.delete);

  // Optional bulk operations
  if (controller.bulkCreate) {
    router.post('/bulk', ...write, controller.bulkCreate);
  }
  if (controller.bulkUpdate) {
    router.put('/bulk', ...write, controller.bulkUpdate);
  }
  if (controller.bulkDelete) {
    router.delete('/bulk', ...write, controller.bulkDelete);
  }

  return router;
};

module.exports = { createCrudController, createCrudRoutes };
