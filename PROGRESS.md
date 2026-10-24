# Implementation Progress

Running log so a fresh session can pick up without redoing finished work.
Dates are in YYYY-MM-DD.

## Current state — 2026-10-24

Backend and frontend are **both complete and green**. Documentation is the
remaining work.

| Check | Result |
|---|---|
| Backend tests (pytest) | **143 passed, 0 failed** |
| Backend coverage on `app/` | **96%** statements |
| Backend lint (ruff) | clean |
| Frontend tests (Vitest + RTL) | **60 passed, 0 failed** |
| Frontend lint (ESLint 9 flat config) | clean |
| Frontend production build | succeeds |
| End-to-end in a real browser | verified, see below |

## Environment notes

- Python 3.13.17 in `backend/venv` (invoke as `backend\venv\Scripts\python.exe`).
- Node 24.22.1 / npm 11.19.1.
- PostgreSQL 16.15 runs **in Docker**, not natively: `docker compose up -d`.
  Start it before any test run or every database test fails to connect.
- Databases `dealership` and `dealership_test` are both migrated to head
  (`97b120c97e99`).
- `backend/.env` and `frontend/.env` exist locally and are gitignored. Only the
  `.env.example` files are committed, and they contain placeholders.
- The local dev administrator is `admin@apexmotors.com`. Its password is the
  `ADMIN_PASSWORD` value in the gitignored `backend/.env` — deliberately not
  written down here, because this file is committed.

## Phase log

### Phase 1 — Repository audit — done
Found a package skeleton only: empty `main.py`, empty `conftest.py`, pinned
`requirements.txt`, working `docker-compose.yml`. No functionality existed.
Postgres was not running; started it. Installed the two missing dependencies
(`ruff`, `email-validator`).

### Phase 2 — Database foundation — done (`3c94831`)
Settings via pydantic-settings, engine/session plumbing, `User` and `Vehicle`
models, Pydantic schemas, Alembic wired to read the URL from settings, initial
migration `97b120c97e99`. Money is `NUMERIC(12,2)` ↔ `Decimal`. DB-level check
constraints: `price > 0`, `quantity >= 0`, non-blank make/model/category,
`role in ('user','admin')`.

### Phase 3 — Authentication TDD — done (`e43d444` red, `003dfa3` green)
Red evidence: 20 errors, `ImportError` on `app.main` before any code existed.
bcrypt hashing, PyJWT tokens, `get_current_user` / `require_admin`,
`/api/auth/register|login|me`. Registration ignores any `role` in the body.

### Phase 4 — Vehicle API TDD — done (`3aaef4f` red, `fe82c1e` green)
Red evidence: 54 failed, 4 passed before the router existed.
List with optional pagination, `/search` registered before `/{vehicle_id}`,
get, create, update (full or partial body), delete (204), purchase, restock.

**Documented interpretation:** the kata lists `POST /api/vehicles` and
`PUT /api/vehicles/{id}` as "protected" without naming a role. This project
makes both **admin-only**. Anonymous callers still get 401 everywhere.

### Phase 5 — Inventory TDD — done (`9826b34`)
**Honest ordering note:** purchase and restock endpoints already existed — the
Phase 4 permission tests drove them in — so all 18 inventory tests passed on
first run. To show the concurrency tests are not vacuous, the atomic
`UPDATE ... WHERE quantity > 0` was temporarily replaced with a naive
read-then-write: both concurrency tests failed, selling **10 units from a stock
of 3**. Restoring the atomic version made them pass.

### Phase 5b — Seed and admin bootstrap — done (`1ea7162`, `7d37918`)
`app/utils/seed.py` (18 demo vehicles, idempotent on `(make, model)`, two
out-of-stock, descriptions prefixed `[Demo data]`, `image_url` left NULL on
purpose so the frontend draws its own placeholder) and
`app/utils/create_admin.py` (env-driven, re-runnable, `--reset-password`).

### Phase 5c — Free-text search — done (`fa89d5a`)
Added `q` to `/api/vehicles/search`, matching make OR model, ANDed with the
named filters, LIKE wildcards escaped. Tests first: 4 of 6 failed before the
parameter existed.

### Phase 6–8 — Frontend — done (`5a85ab4`)
Vite + React 18 + Tailwind + React Router SPA against the real API.
Centralised axios client, `AuthContext` (token in memory, mirrored to
sessionStorage, XSS limitation documented in the client), login, registration,
dashboard, vehicle details, admin management, 404, route guards, toasts,
per-category image placeholders.

### Bug found by end-to-end testing — fixed (`7fd801d`)
An administrator created with `admin@dealership.local` could never sign in:
`email-validator` rejects `.local` as a reserved TLD at `/api/auth/login`, but
the bootstrap script did no validation and happily wrote a dead account. The
script now validates through the same `EmailStr` rules. Tests written first;
both cases failed before the fix.

### Phase 9 — Frontend tests — done (`459d5cb`)
60 Vitest + RTL tests. Two failed on first run and found a real bug:
`formatPrice(null)` rendered `"$0"` because `Number(null)` is `0`. Empty values
now render an em dash.

### Browser verification (manual, against the running stack)
Login, logout, registration, purchase (stock 9 → 8 with toast), vehicle create,
restock (0 → 5), delete with confirmation, search (`tesla` → 2 of 18), stats
matching the seed exactly, out-of-stock button disabled, mobile layout with no
horizontal overflow (`scrollWidth == clientWidth == 375`), and **403 from the
API on every admin operation attempted with a regular user's token** — proving
the security boundary is server-side, not just hidden UI.

Seven screenshots captured in `screenshots/`.

## Next steps

1. `README.md` — full setup guide, API reference, "My AI Usage" section.
2. `TEST_REPORT.md` — real command output and measured results.
3. `PROMPTS.md` — raw transcript. **See the warning below.**

## Known gaps and warnings

- **The raw Claude Code transcript contains live secrets.** It lives at
  `~/.claude/projects/C--Users-Aditya-Singh-incubyteproject-car-dealership-inventory/<session-id>.jsonl`
  and includes a read of `backend/.env`, so it contains the local database
  password and JWT secret. Redact it before pasting any of it into
  `PROMPTS.md` or publishing it.
- `docker-compose.yml` carries the local dev database password in plain text.
  It was committed before this work started and is local-only, so it was left
  alone; rotate it if the compose file is ever used beyond a dev machine.
- `app/db/session.py` `get_db` lines are uncovered: tests override the
  dependency to reach the test database. Exercised in production by every
  request.
- `app/utils/seed.py` `main()` is uncovered — the CLI wrapper around the tested
  `seed_vehicles()`.
- No deployment has been done, and nothing has been deployed or hosted.
