# Implementation Progress

Running log so a fresh session can pick up without redoing finished work.
Dates are in YYYY-MM-DD.

## Current state — 2026-10-24

Backend is **complete and green**. Frontend is **not started**.

- Backend test suite: **133 passed, 0 failed**, **96% statement coverage** on `app/`.
- Ruff: clean on `backend/app` and `backend/tests`.
- PostgreSQL 16.15 running via `docker compose up -d` (container `dealership-db`).
- Databases `dealership` and `dealership_test` both migrated to head (`97b120c97e99`).
- Dev inventory seeded with 18 demo vehicles; local admin created.

## Environment notes

- Python 3.13.17 in `backend/venv` (invoke as `backend\venv\Scripts\python.exe`).
- Postgres is **not** installed natively — it runs in Docker. Start it before
  any test run, or every DB test fails with a connection error.
- `backend/.env` exists and is gitignored. It carries `DATABASE_URL`,
  `TEST_DATABASE_URL`, `JWT_*`, `CORS_ORIGINS` and the `ADMIN_*` bootstrap vars.
- Local dev admin: `admin@dealership.local` / `AdminPass123!`
  (**local demo credential only — change or delete before any real use**).

## Phase log

### Phase 1 — Repository audit — done
Found a package skeleton only: empty `main.py`, empty `conftest.py`, pinned
`requirements.txt`, working `docker-compose.yml`. No functionality existed.
Postgres was not running; started it. Installed the two missing deps (`ruff`,
`email-validator`).

### Phase 2 — Database foundation — done
Commit `3c94831`.
`app/core/config.py` (pydantic-settings), `app/db/{base,session}.py`,
`app/models/{user,vehicle}.py`, `app/schemas/{auth,user,vehicle}.py`, Alembic
set up with `env.py` reading the URL from settings, initial migration
`97b120c97e99`. Money is `NUMERIC(12,2)` ↔ `Decimal`. DB-level check
constraints: `price > 0`, `quantity >= 0`, non-blank make/model/category,
`role in ('user','admin')`.

### Phase 3 — Authentication TDD — done
Commits `e43d444` (tests, RED), `003dfa3` (implementation, GREEN).
Red evidence: 20 errors, `ImportError` on `app.main` before any code existed.
bcrypt hashing, PyJWT tokens, `get_current_user` / `require_admin`,
`/api/auth/register|login|me`. Registration ignores any `role` in the body.

### Phase 4 — Vehicle API TDD — done
Commits `3aaef4f` (tests, RED), `fe82c1e` (implementation, GREEN).
Red evidence: 54 failed, 4 passed before the router existed.
List (optional pagination), `/search` registered before `/{vehicle_id}`,
get, create, update (full or partial body), delete (204), purchase, restock.
Search uses case-insensitive substring matching with LIKE wildcards escaped.

**Documented interpretation:** the kata lists `POST /api/vehicles` and
`PUT /api/vehicles/{id}` as "protected" without naming a role. This project
makes both **admin-only**. Anonymous callers still get 401 everywhere.

### Phase 5 — Inventory TDD — done
Commit `9826b34`.
**Honest ordering note:** purchase and restock endpoints already existed —
the Phase 4 permission tests drove them in — so all 18 inventory tests passed
on first run. To show the concurrency tests are not vacuous, the atomic
`UPDATE ... WHERE quantity > 0` was temporarily replaced with a naive
read-then-write: both concurrency tests failed, selling **10 units from a
stock of 3**. Restoring the atomic version made them pass.

### Phase 5b — Seed and admin bootstrap — done
`app/utils/seed.py` (18 demo vehicles, idempotent on `(make, model)`, 2
out-of-stock, all descriptions prefixed `[Demo data]`, `image_url` left NULL
on purpose so the frontend draws its own placeholder) and
`app/utils/create_admin.py` (env-driven, re-runnable, `--reset-password`).
Coverage rose from 88% to 96% with tests for both plus health/OpenAPI.

## Next steps

1. **Phase 6** — frontend foundation: Vite + React + Tailwind, router, API
   client, auth context, login and registration pages.
2. **Phase 7** — inventory dashboard: stats from real API data, filters,
   vehicle cards, purchase.
3. **Phase 8** — admin management UI: add, edit, delete, restock.
4. **Phase 9** — frontend tests (Vitest + RTL), production build, responsive
   checks.
5. **Phase 10** — README, TEST_REPORT.md, PROMPTS.md, screenshots.

## Known gaps

- No frontend yet.
- `app/db/session.py` `get_db` lines are uncovered: tests override the
  dependency to reach the test database. Exercised in production by every
  request.
- `app/utils/seed.py` `main()` is uncovered — it is the CLI wrapper around the
  tested `seed_vehicles()`.
- No screenshots captured yet.
- `PROMPTS.md` still needs the raw transcript pasted in by the repository owner.
