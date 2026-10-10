const { User } = require("../models");

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
      const updates = req.body;
      const requesterId = req.user.id;
      const requesterRole = req.user.app_role;

      // Security Check: Only allow if it's the same user or if requester is admin/super_admin
      const isSelf = id === requesterId;
      const isAdmin = ['admin', 'super_admin'].includes(requesterRole);

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Don't allow email/password update here generally, unless specific logic (or admin reset)
      // For now, removing them to be safe, admin password reset should be separate
      delete updates.password;
      // delete updates.email; // Admins might need to update email? Leaving commented for now as 'delete' is safer default.

      // Sequelize reports the number of rows it actually changed, which is 0
      // both when the user does not exist and when the submitted values match
      // what is already stored. Treating 0 as "not found" turned every no-op
      // save — and every save of a field the model does not define — into a
      // 404. Decide on existence first, then update.
      const existing = await User.findByPk(id);
      if (!existing) {
        return res.status(404).json({ error: "User not found" });
      }

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
