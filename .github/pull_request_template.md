## What and why

<!-- One paragraph. Link tracker IDs, e.g. SEC-3, DB-2 (docs/engineering/TRACKER.md). -->

## Type

- [ ] fix
- [ ] feat
- [ ] security
- [ ] refactor / chore
- [ ] docs

## Checks run (paste results)

- [ ] `npm run build`
- [ ] `npm run lint:ratchet`
- [ ] `npm test`
- [ ] `npm --prefix backend test`

## Risk

- [ ] Touches auth, roles, payments, uploads or SQL → reviewed by `security-auditor`
- [ ] Schema change → migration + rollback per `db-migration-review`
- [ ] New env vars added to `.env.example` / `backend/.env.example`
- [ ] No secrets, dumps, `dist/` or unrelated files in the diff

## Not tested / follow-ups

<!-- Be explicit about anything not verified. -->
