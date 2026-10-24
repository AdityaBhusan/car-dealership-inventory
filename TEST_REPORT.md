# Test Report

**Execution date:** 2026-10-24
**Verification status:** ✅ All suites pass. Backend coverage 96%, above the 85% target.

Every number and block of output below was produced by actually running the
commands shown, on the machine described. Nothing here is estimated.

---

## 1. Testing environment

| Component | Version |
|---|---|
| OS | Windows 11 Home Single Language 10.0.26200 |
| Shell | Windows PowerShell 5.1 |
| Python | 3.13.17 (`backend/venv`) |
| PostgreSQL | 16.15 (Debian 16.15-1.pgdg13+2), in Docker container `dealership-db` |
| Node.js | 24.22.1 |
| npm | 11.19.1 |
| pytest | 8.3.3 |
| pytest-cov | 5.0.0 |
| Vitest | 2.1.8 |
| ruff | 0.7.4 |
| ESLint | 9.17.0 |

Test database: `dealership_test`, separate from the development database
`dealership`. The schema is created by running the real Alembic migrations
once per session; tables are truncated between tests so each test starts empty
while real `COMMIT`s remain available for the concurrency tests.

---

## 2. Commands executed

```powershell
# Backend
cd backend
.\venv\Scripts\ruff.exe check app tests --config ruff.toml
.\venv\Scripts\python.exe -m pytest tests --cov=app --cov-report=term-missing

# Frontend
cd frontend
npm run lint
npm test
npm run build
```

---

## 3. Backend results

### 3.1 Lint

```text
All checks passed!
```

### 3.2 Test suite

```text
143 passed, 1 warning in 107.27s (0:01:47)
```

**0 failed, 0 skipped, 0 errors.**

The single warning is a `DeprecationWarning` from Starlette's `testclient`
module about an `anyio.abc.BlockingPortal` alias. It originates in a third-party
dependency, not in this project's code, and does not affect results.

### 3.3 Tests by file

| File | Tests | Covers |
|---|---:|---|
| `tests/integration/test_auth.py` | 20 | Registration, login, token handling |
| `tests/integration/test_vehicles.py` | 42 | Vehicle CRUD, search, free-text search |
| `tests/integration/test_permissions.py` | 22 | Anonymous / customer / admin matrix |
| `tests/integration/test_inventory.py` | 18 | Purchase, restock, concurrency |
| `tests/integration/test_create_admin.py` | 14 | Administrator bootstrap script |
| `tests/integration/test_seed.py` | 7 | Seed idempotency and content |
| `tests/integration/test_meta.py` | 3 | Health check, OpenAPI schema |
| `tests/unit/test_security.py` | 17 | bcrypt hashing, JWT issue/verify |
| **Total** | **143** | |

### 3.4 Coverage

```text
---------- coverage: platform win32, python 3.13.17-final-0 ----------
Name                                     Stmts   Miss  Cover   Missing
----------------------------------------------------------------------
app\__init__.py                              0      0   100%
app\api\__init__.py                          0      0   100%
app\api\auth.py                             28      3    89%   33-36
app\api\vehicles.py                         60      0   100%
app\core\__init__.py                         0      0   100%
app\core\config.py                          16      0   100%
app\core\dependencies.py                    32      2    94%   40-41
app\core\security.py                        27      0   100%
app\db\__init__.py                           0      0   100%
app\db\base.py                               3      0   100%
app\db\session.py                           11      4    64%   17-21
app\main.py                                 12      0   100%
app\models\__init__.py                       3      0   100%
app\models\user.py                          20      1    95%   35
app\models\vehicle.py                       19      0   100%
app\repositories\__init__.py                 0      0   100%
app\repositories\vehicle_repository.py      45      1    98%   77
app\schemas\__init__.py                      0      0   100%
app\schemas\auth.py                         29      0   100%
app\schemas\user.py                          9      0   100%
app\schemas\vehicle.py                      55      0   100%
app\services\__init__.py                     0      0   100%
app\services\auth_service.py                25      0   100%
app\services\vehicle_service.py             54      1    98%   101
app\utils\__init__.py                        0      0   100%
app\utils\create_admin.py                   58      1    98%   104
app\utils\seed.py                           34      7    79%   93-99, 103
----------------------------------------------------------------------
TOTAL                                      540     20    96%
```

**96% statement coverage, 20 uncovered statements out of 540.** Target was 85%.

What is not covered, and why:

| Location | Lines | Reason |
|---|---|---|
| `db/session.py` | 17–21 | The `get_db` dependency body. Tests override it to reach the test database; every real HTTP request exercises it. |
| `utils/seed.py` | 93–99, 103 | The `main()` CLI wrapper. The `seed_vehicles()` function it calls is fully tested, and the CLI was run manually (output in §6). |
| `api/auth.py` | 33–36 | The `IntegrityError` branch for two identical registrations racing past the duplicate check. Reachable only under a real race. |
| `core/dependencies.py` | 40–41 | Guard for a token whose `sub` claim is non-numeric. PyJWT's `require` option rejects most malformed tokens earlier. |
| `models/user.py` | 35 | The `is_admin` convenience property; the role string is compared directly in `require_admin`. |
| `vehicle_repository.py` | 77, `vehicle_service.py` | 101 | Defensive `None` branches on atomic updates, reached only if a row vanishes mid-statement. |

---

## 4. Frontend results

### 4.1 Lint

```text
> eslint .
```

No output, exit code 0 — clean.

### 4.2 Test suite

```text
 Test Files  6 passed (6)
      Tests  60 passed (60)
   Duration  11.89s
```

| File | Tests |
|---|---:|
| `src/utils/format.test.js` | 13 |
| `src/services/apiClient.test.js` | 10 |
| `src/components/VehicleCard.test.jsx` | 9 |
| `src/components/VehicleForm.test.jsx` | 11 |
| `src/pages/DashboardPage.test.jsx` | 12 |
| `src/pages/LoginPage.test.jsx` | 5 |
| **Total** | **60** |

React Router emits two "Future Flag Warning" messages per test file, advising
about v7 opt-in flags. They are informational notices from the library, not
failures, and the project intentionally stays on v6 defaults.

### 4.3 Production build

```text
vite v6.0.7 building for production...
✓ 1656 modules transformed.
dist/index.html                   0.75 kB │ gzip:  0.42 kB
dist/assets/index-VRlW_8r4.css   27.78 kB │ gzip:  5.22 kB
dist/assets/index-CYHoTnXZ.js   265.94 kB │ gzip: 84.23 kB
✓ built in 5.82s
```

Build succeeds. The CSS bundle confirms Tailwind is generating styles.

---

## 5. Test-driven development evidence

Red states below were observed by running the suite, and are recorded in the
commit messages at the time.

| Phase | Red state actually observed | Commit (red → green) |
|---|---|---|
| Authentication | 20 errors — `ImportError` on `app.main`, still an empty module | `e43d444` → `003dfa3` |
| Vehicle API & permissions | 54 failed, 4 passed — no vehicle router existed | `3aaef4f` → `fe82c1e` |
| Free-text search (`q`) | 4 of 6 failed — two passed coincidentally, fixtures had a single matching row | tests and fix in `fa89d5a` |
| Admin email validation | 2 failed — reserved-TLD and malformed addresses were accepted | tests and fix in `7fd801d` |
| Frontend | 3 failed of 60 — one a real bug (`formatPrice(null)` → `"$0"`) | `459d5cb` |

### Where TDD ordering did not hold — stated plainly

The 18 purchase/restock tests in `test_inventory.py` **passed on first run**.
The endpoints already existed because the Phase 4 permission tests required
them. There was no red phase for that file, and the commit message says so.

To demonstrate the concurrency tests were not vacuous, the atomic
`UPDATE ... WHERE quantity > 0` was temporarily replaced with a naive
read-then-write (read quantity, sleep, write quantity − 1). Both concurrency
tests failed immediately:

```text
>       assert statuses.count(200) == 3, statuses
E       AssertionError: [200, 200, 200, 200, 200, 200, ...]
E       assert 10 == 3

FAILED tests/integration/test_inventory.py::TestConcurrentPurchases::test_only_one_of_eight_concurrent_purchases_of_the_last_unit_succeeds
FAILED tests/integration/test_inventory.py::TestConcurrentPurchases::test_concurrent_purchases_never_oversell_limited_stock
2 failed, 16 deselected, 1 warning in 4.85s
```

The naive implementation sold **10 units from a stock of 3**. The atomic
version was restored and both tests passed again (`18 passed`).

---

## 6. Manual end-to-end verification

Performed in a real browser against the running stack (Uvicorn on `:8000`,
Vite on `:5173`, PostgreSQL in Docker), with the database seeded.

| Scenario | Result |
|---|---|
| Unauthenticated visit to `/` | Redirected to `/login` ✅ |
| Admin sign-in | Dashboard loaded ✅ |
| Dashboard statistics | 18 models, 97 units, $3.4M, 2 out of stock — matched the seed exactly ✅ |
| Purchase from details page | Stock 9 → 8, success toast, timestamp updated ✅ |
| Create vehicle (Porsche 911 Carrera) | 19 models / 98 units, toast shown ✅ |
| Empty-form validation | Submission blocked, per-field errors shown ✅ |
| Restock Hyundai Tucson (+5) | 0 → 5, badge flipped from "Out of stock" to "In stock · 5" ✅ |
| Delete, with confirmation dialog | Removed, back to 18 models ✅ |
| Search `tesla` | 2 of 18 shown; summary stats stayed whole-inventory ✅ |
| Out-of-stock card | Button `disabled`, labelled "Out of stock" ✅ |
| Registration of a new customer | Account created and signed in ✅ |
| Customer navigation | No "Manage inventory" link rendered ✅ |
| Customer visiting `/admin` | Redirected to `/` ✅ |
| **Customer token against admin API endpoints** | `POST /api/vehicles` → **403**, `DELETE /api/vehicles/1` → **403**, `POST /api/vehicles/1/restock` → **403**, `GET /api/vehicles` → **200** ✅ |
| Mobile layout at 375×812 | `scrollWidth == clientWidth == 375`, no horizontal overflow ✅ |

The last row matters most: the role restriction was checked by calling the API
directly with a regular user's token, proving the boundary is enforced by the
server and not merely by hidden UI.

Seed idempotency was also verified by running the script twice:

```text
Seed complete: 18 created, 0 updated. 18 vehicles in inventory.
--- rerun for idempotency ---
Seed complete: 0 created, 18 updated. 18 vehicles in inventory.
```

Migrations were verified against both databases:

```text
INFO  [alembic.runtime.migration] Running upgrade  -> 97b120c97e99, create users and vehicles tables
```

---

## 7. Failed tests

None at the time of this report. All 143 backend and 60 frontend tests pass.

Failures encountered **during** development, all investigated and fixed rather
than disabled:

1. **`AssertionError: Status code 204 must not have a response body`** — the
   delete route failed at import because FastAPI inferred a response model from
   the `-> None` return annotation. Fixed with an explicit
   `response_model=None` and `response_class=Response`.
2. **Administrator could not log in** — `email-validator` rejects `.local` as a
   reserved TLD at `/api/auth/login`, but `create_admin.py` did no validation
   and wrote an unusable account. Fixed by validating with the same `EmailStr`
   rules; tests added first.
3. **`expected '$0' to be '—'`** — `formatPrice(null)` rendered `$0` because
   `Number(null)` is `0`. Fixed by treating empty values as absent.
4. **Two over-broad test queries** — `getByText('Out of stock')` and
   `/Sedan/` matched multiple elements. The tests were tightened (scoped to the
   summary region, matched exact subtitle text); no production code changed.

No test has been skipped, `xfail`-ed or deleted to make the suite green.

---

## 8. Known issues

- Two React Router v7 future-flag warnings per frontend test file
  (informational, from the library).
- One Starlette `DeprecationWarning` in the backend suite (third-party).
- The concurrency tests are timing-sensitive by nature. They passed
  consistently across every run during development, but a heavily loaded
  machine could in principle affect thread scheduling. They are marked `slow`
  and can be excluded with `pytest -m "not slow"`.
- The full backend suite takes roughly 1m 47s, largely due to bcrypt hashing
  (deliberately slow) and per-test truncation.

---

## 9. Reproducing this report

```powershell
# 1. Start PostgreSQL
docker compose up -d
docker inspect -f '{{.State.Health.Status}}' dealership-db   # wait for "healthy"

# 2. Backend
cd backend
.\venv\Scripts\Activate.ps1
alembic upgrade head
pytest --cov=app --cov-report=term-missing

# 3. Frontend
cd ..\frontend
npm install
npm run lint
npm test
npm run build
```

If the backend tests fail with
`psycopg.OperationalError: connection failed ... port 5432`, PostgreSQL is not
running — run `docker compose up -d` and wait for the health check to report
`healthy`.
