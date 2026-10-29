---
name: api-endpoint
description: Add or modify an Express API endpoint in backend/ following this project's conventions (route file, auth/role middleware, ownership, field whitelist, validation, pagination, error shape, supertest regression test). Use when creating or changing any backend route.
argument-hint: "[METHOD /api/path]"
---

1. Find the route file in `backend/src/routes/` (registered in `routes/index.js`). Reuse existing controllers/services; avoid new copies of `crudController` logic.
2. Apply middleware from `backend/src/middleware/auth.js` (read it to get exact export names) — authenticate first, then role.
3. Controller: validate input, whitelist fields, enforce ownership, paginate (`limit` default 20, max 100), wrap multi-writes in `sequelize.transaction()`.
4. Response shape: success → JSON body consistent with neighbouring routes; errors → `{ error: "<generic message>" }` with correct status (400/401/403/404/409/422/500).
5. Test in `backend/test/`: at minimum 401 without token, 403 with wrong role (if applicable), validation 400, and happy path with stubbed model.
6. Update the frontend caller in `src/api/` if the contract changed; note the change in the PR.
7. Run `npm --prefix backend test` and paste the result.
