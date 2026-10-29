const { User } = require("../models");
const { effectiveRole, isSuperAdmin, checkRoleChange } = require("../utils/roles");

/**
 * Columns that carry privilege or identity. Nobody may set them on their own
 * account (see `update` below for the history), and only an admin may set
 * them on someone else's through `updateById`.
 */
const PRIVILEGE_FIELDS = [
  "password",
  "email",
  "id",
  "role",
  "app_role",
  "is_admin",
  "is_premium",
  "status",
  "email_verified",
  "verify_step",
  "google_id",
];

class UserController {
  static async me(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req, res) {
    try {
      const userId = req.user.id;
      const updates = { ...req.body };

      /**
       * Fields nobody may set on their own account.
       *
       * This endpoint used to strip only `password` and `email`, so a single
       * `PUT /users/me` with `{"app_role":"super_admin"}` promoted the caller
       * to super admin — and `{"is_premium":true}` handed them a paid plan.
       * Verified against a live account before this change: an ordinary user
       * became super_admin with premium in one request.
       *
       * An allow-list would be safer still, but this endpoint is the generic
       * profile save and the set of legitimate profile fields is wide and
       * grows; a deny-list of the privilege-bearing columns is the change that
       * can be made without breaking the screens that use it. Role changes go
       * through the admin endpoints, which check the caller's own role.
       */
      for (const field of PRIVILEGE_FIELDS) delete updates[field];

      // Sequelize's affected-row count is 0 both when the record is missing and
      // when the new values equal the stored ones, so treating 0 as 'not found'
      // turned every no-op save into a 404. Check existence, then update.
      const existingSelf = await User.findByPk(userId);
      if (!existingSelf) {
        return res.status(404).json({ error: "User not found" });
      }

      await User.update(updates, { where: { id: userId } });

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      return res.status(200).json(user);
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateById(req, res) {
    try {
      const { id } = req.params;
      const updates = { ...req.body };
      const requesterId = req.user.id;

      // Security Check: Only allow if it's the same user or if requester is admin/super_admin
      const isSelf = String(id) === String(requesterId);
      const isAdmin = ['admin', 'super_admin'].includes(effectiveRole(req.user));

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Editing your own record through this route used to bypass the
      // deny-list on PUT /users/me: `PUT /users/<own id>` with
      // {"app_role":"super_admin"} promoted any user. Self-edits — admins
      // included — now get the same treatment as /users/me.
      if (isSelf) {
        for (const field of PRIVILEGE_FIELDS) delete updates[field];
      }

      // Passwords are never set here; resets have their own flow.
      delete updates.password;
      delete updates.id;

      // Changing someone's email then requesting a reset hands over their
      // account, so only a super admin may do it.
      if (!isSuperAdmin(req.user)) delete updates.email;

      // Sequelize reports the number of rows it actually changed, which is 0
      // both when the user does not exist and when the submitted values match
      // what is already stored. Treating 0 as "not found" turned every no-op
      // save — and every save of a field the model does not define — into a
      // 404. Decide on existence first, then update.
      const existing = await User.findByPk(id);
      if (!existing) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only a super admin may edit a super admin's account, or produce one —
      // judged on app_role || role, the same rule every role check uses.
      if (!isSelf && isSuperAdmin(existing) && !isSuperAdmin(req.user)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const refused = checkRoleChange(req.user, existing, updates);
      if (refused) return res.status(refused.status).json({ error: refused.error });

      await User.update(updates, { where: { id } });

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });

      return res.status(200).json(user);
    } catch (error) {
      console.error("Update user by ID error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async list(req, res) {
    try {
      const { limit = 50, offset = 0, role } = req.query;
      const where = {};

      if (role) {
        where.role = role;
      }

      const users = await User.findAll({
        where,
        attributes: { exclude: ['password'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      return res.status(200).json(users);
    } catch (error) {
      console.error("List users error:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = UserController;
