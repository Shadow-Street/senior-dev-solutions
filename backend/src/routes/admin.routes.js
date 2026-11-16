const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/AdminController");
const { authenticate, adminMiddleware } = require("../middleware/auth");
const { requirePermission, requireSuperAdmin } = require("../middleware/permissions");

// Every admin route needs a signed-in caller. Which staff may use each route
// is decided per route: User Management is permission-gated so a sub-admin
// given those permissions in Roles & Permissions can use it; the rest stays
// admin / super admin only.
router.use(authenticate);

// What the caller may see and do in the admin panel (any signed-in user; a
// non-staff caller gets an empty permission list).
router.get("/access/me", AdminController.myAccess);

router.get("/dashboard-stats", adminMiddleware, AdminController.getDashboardStats);
router.get("/subscription-analytics", adminMiddleware, AdminController.getSubscriptionAnalytics);

// --- User Management --------------------------------------------------------
router.get("/users", requirePermission("users.view"), AdminController.listUsers);
router.patch("/users/:id", requirePermission("users.edit"), AdminController.editUser);
router.put("/users/:id/role", requirePermission("users.roles"), AdminController.setUserRole);
router.put("/users/:id/trust-score", requirePermission("users.trust"), AdminController.adjustTrustScore);
router.post("/users/:id/status", requirePermission("users.status"), AdminController.setUserStatus);
router.delete("/users/:id", requireSuperAdmin, AdminController.deleteUser);
// Legacy combined status/role update (old admin dashboard); checks the
// matching permission for each field it is given.
router.put("/users/:id", requirePermission("users.view"), AdminController.updateUserStatus);

// --- Roles & Permissions ----------------------------------------------------
router.get("/access/assignable-roles", requirePermission("users.roles"), AdminController.assignableRoles);
router.get("/access/matrix", adminMiddleware, AdminController.permissionMatrix);
router.get("/access/templates", adminMiddleware, AdminController.listRoleTemplates);
router.get("/access/audit", adminMiddleware, AdminController.accessAuditLog);
// Editing roles and permissions is super-admin only: a grantable "manage
// permissions" would let its holder grant themselves everything.
router.post("/access/roles", requireSuperAdmin, AdminController.createRole);
router.patch("/access/roles/:roleId", requireSuperAdmin, AdminController.updateRole);
router.delete("/access/roles/:roleId", requireSuperAdmin, AdminController.deleteRole);
router.put("/access/roles/:roleId/permissions/:key", requireSuperAdmin, AdminController.setRolePermission);
router.post("/access/templates", requireSuperAdmin, AdminController.createRoleTemplate);
router.patch("/access/templates/:templateId", requireSuperAdmin, AdminController.updateRoleTemplate);
router.delete("/access/templates/:templateId", requireSuperAdmin, AdminController.deleteRoleTemplate);

module.exports = router;
