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
      return res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Don't allow password updates through this endpoint
      delete updates.password;
      delete updates.email;

      const [updated] = await User.update(updates, {
        where: { id: userId }
      });

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      return res.status(200).json(user);
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ error: error.message });
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

      const [updated] = await User.update(updates, {
        where: { id }
      });

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });

      return res.status(200).json(user);
    } catch (error) {
      console.error("Update user by ID error:", error);
      return res.status(500).json({ error: error.message });
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
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UserController;
