---
name: db-migration-review
description: Write or review a MySQL schema migration for this project (numbering, rollback, constraints, indexes, data safety, model sync). Use for any schema change or before running any SQL/script against a database.
---

1. Next number: `ls backend/src/migrations/` — use the next unused integer (current files include duplicate 010_/011_; never add another duplicate).
2. File `NNN_<desc>.sql` with a header: purpose, author, date, reversible? and a `-- DOWN` section (or a written recovery procedure if irreversible).
3. Checklist:
   - [ ] Idempotent where possible (`IF NOT EXISTS`, guarded ALTERs).
   - [ ] FKs with explicit `ON DELETE`; indexes on FKs and filtered columns.
   - [ ] Money `DECIMAL`, not FLOAT/DOUBLE; timestamps UTC.
   - [ ] Large-table ALTERs considered for locking (`ALGORITHM=INPLACE, LOCK=NONE` where supported).
   - [ ] Sequelize model updated to match; `sequelize.sync()` won't fight the migration.
   - [ ] Destructive? → impact, backup step, recovery plan, explicit approval recorded.
4. Execution: only against a disposable DB the user names. Otherwise state "statically reviewed, not executed".
