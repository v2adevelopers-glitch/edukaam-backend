# EduJobs Backend

REST API for **EduJobs**, a job portal that connects educational institutions (schools, colleges, universities, coaching institutes) with job seekers (teachers, lecturers, professors, librarians, lab assistants, office staff, drivers, security guards, peons and similar roles).

Node 22 · Express 5 · Sequelize 6 / MySQL · Joi · JWT. The structure, conventions and database rules follow [BLUEPRINT.md](BLUEPRINT.md). The frontend contract (every endpoint with real example responses, and what the frontend must change) is in [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md).

---

## Getting started

### Prerequisites

- Node.js 22 and npm
- MySQL 8 (an empty database and a user with full rights on it)

### Setup

```bash
npm install
cp .env.example .env      # then fill it in (see below)
```

| Variable | Meaning |
|---|---|
| `NODE_ENV` | `development` (dev.json), `testing` (uat.json) or `production` (prod.json) |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | MySQL connection |
| `DB_TIMEZONE` | Optional. DB session time zone, default `+05:30`, so `CURDATE()` is the Indian date |
| `JWT_SECRET_KEY` | Long random string used to sign tokens |
| `SEED_ADMIN_PASSWORD` | Password of the admin user created by the seeder |
| `SEED_DEMO_DATA` | `true` to load the demo providers, seekers, jobs and applications |
| `SEED_DEMO_PASSWORD` | Password of every demo account (required when `SEED_DEMO_DATA=true`) |
| `PROD_API_URL` | Production base URL shown as a server in Swagger |
| `UPLOAD_DIR` | Where resumes and logos are stored (default `./uploads`). In production use an absolute path **outside** the deploy checkout: the workflow's checkout deletes untracked files |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Outgoing email for password reset and verification codes |
| `SMS_WEBHOOK_URL`, `SMS_WEBHOOK_TOKEN` | Outgoing SMS: the API POSTs `{ to, message }` here (with `Authorization: Bearer <token>` if set). Point it at your SMS gateway or a small adapter in front of one |

Without SMTP / SMS settings, a non-production server prints each message to its log (`[OUTBOX:EMAIL]`, `[OUTBOX:SMS]`) so codes can be tested; a production server refuses to send (forgot-password still answers the same, verification answers `503 otp_delivery_failed`).

Other settings (port, cron switch, frontend URL, proxy trust, rate limits) live in `app/config/dev.json`, `uat.json` and `prod.json`.

### Run

```bash
npm run dev                      # nodemon; first start creates every table (sync)
npx sequelize-cli db:seed:all    # roles, admin, menus/RBAC, master data, demo data (optional)
```

- API: `http://localhost:8080/api/v1/...`
- Swagger UI: `http://localhost:8080/api-docs`
- Health check: `GET http://localhost:8080/`

Seeders skip rows that already exist, so `db:seed:all` can be run again at any time.

### Seeded accounts

| Account | Login (`username`) | Password |
|---|---|---|
| Admin | `admin@example.com` or `9999999999` | `SEED_ADMIN_PASSWORD` |
| Demo job providers (6) | `hr.greenfield@example.com`, `admin.sunrise@example.com`, `office.northbridge@example.com`, `careers.deccantech@example.com`, `jobs.apexacademy@example.com`, `hr.riverside@example.com` (phones `0000100001`…`0000100006`) | `SEED_DEMO_PASSWORD` |
| Demo job seekers (20) | e.g. `aarav.sharma@example.com` (Primary Teacher), `rohan.gupta@example.com` (Secondary Teacher), `meera.iyer@example.com` (Professor); phones `0000200001`…`0000200020`. Full list in `app/data/demo_data.json` | `SEED_DEMO_PASSWORD` |

Demo accounts exist only when `SEED_DEMO_DATA=true`. All emails use `@example.com` and the phone numbers are fictional.

### Background jobs

Cron jobs start with the server when `ENABLE_CRON` is `true` in the env config (`app/config/*.json`).

| Job | Schedule | What it does |
|---|---|---|
| `close-expired-jobs` | Daily 00:05 IST | Sets `job_status = 'closed'` on open jobs whose `last_date` is before `CURDATE()` |
| `purge-rate-limit-hits` | Hourly | Deletes rate-limit counters whose window has ended |

Run it once by hand:

```bash
node -e "require('dotenv').config(); setTimeout(async () => { await require('./app/cron').runJob('close-expired-jobs'); process.exit(0); }, 1500)"
```

---

## Project structure

```
app.js                         express app: helmet, cors, Swagger UI, routers, cron, listen
app/
  config/                      sequelize-cli config, env configs (dev/uat/prod.json), swagger.js
  constants/                   role codes and keys, job/application constants
  controller/<area>.controller.js
  service/<area>.service.js    all DB access; registration.service.js orchestrates user + profile
  router/<area>.router.js      routes + middleware only; router/index.js mounts them
  model/<folder>/<name>.model.js, model/index.js (models, associations, sync)
  middlewares/                 auth (protect, restrictTo, checkApiModuleAccess), validation, rate limits
  helper/                      common (getMeta, ip), code generator, query/date helpers, master-code checks
  lib/                         CustomError, response envelope
  utils/validation.schemas.js  every Joi schema, grouped per area
  docs/<area>.swagger.js       OpenAPI blocks only
  cron/                        scheduler, job runner, schedules, jobs/closeExpiredJobs.js
  data/*.json                  master data, RBAC/menu data and demo data used by seeders
  seeders/                     sequelize-cli seeders
  migrations/                  sequelize-cli migrations (changes to existing tables)
edujobs.postman_collection.json
.github/workflows/deploy.yml
```

---

## API areas

| Area | Base path | Router | Notes |
|---|---|---|---|
| user | `/api/v1/users` | `user.router.js` | `POST /login`, `/register`, `/forgot-password`, `/reset-password` are public and rate limited. `GET /me` restores a session (user, profile, role, menu); `PATCH /password`; `POST /logout` (all sessions); `POST /verify/send` + `/verify/confirm` (email/phone OTP); `GET /me/export`; `DELETE /me`; `PATCH /unlock` (admin) clears a failed-login lockout |
| rbac | `/api/v1/rbac` | `rbac.router.js` | `GET /menu-access/:rolecode`: menu tree of the caller's own role |
| master | `/api/v1/master` | `master.router.js` | `job-categories`, `institution-types`, `states`, `cities`: public `GET` list/detail; admin-only `POST`, `PATCH`, `DELETE` |
| profile | `/api/v1/profile` | `profile.router.js` | `GET`/`PATCH /provider/me`, `PUT`/`DELETE /provider/me/logo` (job provider); `GET`/`PATCH /seeker/me`, `GET`/`PUT`/`DELETE /seeker/me/resume` (job seeker). Uploads are `multipart/form-data`, field `file` |
| job | `/api/v1/job` | `job.router.js` | Provider: `/jobs` CRUD on own jobs. Seeker: `/openings` (open jobs in the seeker's categories), `/saved-jobs` |
| application | `/api/v1/application` | `application.router.js` | Provider: `/applications` list, detail, status change (with interview details), `/export` (CSV), `/bulk-status`, `/:applicationid/notes`, `/:applicationid/resume`. Seeker: `/my-applications` list, detail, apply (with cover note), withdraw |
| dashboard | `/api/v1/dashboard` | `dashboard.router.js` | `GET /provider`, `GET /seeker` |
| public | `/api/v1/public` | `public.router.js` | No token: `/jobs` and `/jobs/:jobid` (open, unexpired jobs), `/logos/:filename` |
| talent | `/api/v1/talent` | `talent.router.js` | Provider candidate search: `/candidates`, `/candidates/:usercode`, `/candidates/:usercode/resume` |
| admin | `/api/v1/admin` | `admin.router.js` | Admin only: `/users` list/detail, `/users/:usercode/status`, `/providers/:usercode/verification`, `/jobs` list, `/jobs/:jobid/moderation`, `/stats` |
| health | `/api/v1/health` | `health.router.js` | No token: API and database status (200 / 503) |

Swagger (`/api-docs`) documents every route with request examples and every status it can return.

---

## API conventions

### Request flow

```
router → protect (JWT) → restrictTo(role) → checkApiModuleAccess (writes) → validateParams/Query/Body (Joi)
       → controller (reads req, builds whereCondition, existence/duplicate checks, throws CustomError)
       → service (all DB access, transactions, row locks) → model
```

Controllers never touch the models; services never see `req`/`res`.

### Responses

Every response uses one envelope:

```json
{ "statusCode": 200, "success": true, "message": "Jobs fetched successfully", "resData": { } }
```

- Lists: `resData: { data: [...], pagination: { total, page, limit, totalPages } }`.
- Errors: `success: false`, a human `message`, and `resData: { error: "<snake_case_name>" }` (for example `job_not_found`, `already_applied`, `job_vacancies_filled`). 500s return `resData: null`.
- Registration answers `201`; everything else that succeeds answers `200`.
- Records are identified by **business codes** (`EDJUSR00001`, `EDJJOB00001`, `EDJAPP00001`, `EDJCAT00001`, …). Database ids are never used in URLs or bodies. Path params such as `:jobid` and `:applicationid` take the code.
- `job_status` (`open`/`closed`) and `application_status` (`applied`/`shortlisted`/`interview`/`hired`/`rejected`) are the business states. The audit `status` column (`active`/`inactive`) is separate.
- No response contains a password hash. A seeker's phone and email are returned only to the provider who owns the job they applied to (`/application/applications` list and detail).

### Validation

All input is validated by Joi schemas in `app/utils/validation.schemas.js`. Unknown fields are stripped, query strings are converted to numbers/booleans and defaults are applied. A validation failure is a `400` with `resData.error = "VALIDATION_ERROR"` and every problem listed in `message`.

---

## Authentication and permissions

- `POST /api/v1/users/login` with `{ username, password }` (`username` is the email or the phone). Send the returned token in the `x-access-token` header. Tokens last 24 hours.
- Five wrong passwords lock the account (`failed_login_attempts`). The admin unlocks it with `PATCH /api/v1/users/unlock` and `{ "username": "<email, phone or user code>" }`.
- Tokens carry a version (`users.token_version`). Logout, a password change or reset, account deletion and admin deactivation bump it, which ends every session of that user (`401 token_revoked`).
- **Password reset:** `POST /users/forgot-password` sends a 6-digit code to the email or, by SMS, the phone given as `username` (same answer whether or not the account exists); `POST /users/reset-password` sets the new password, clears a lockout and ends all sessions.
- **Verification:** `POST /users/verify/send` and `/verify/confirm` with `channel: email|phone`; `user_info.email_verified` / `phone_verified` show the result. Changing the email or phone clears its flag. Verification is not required for anything yet.
- **Codes (OTP):** 6 digits, valid 10 minutes, 5 wrong tries, a new one per purpose every 60 seconds; only an HMAC is stored (`user_otps`).
- `POST /users/login`, `/register`, `/forgot-password`, `/reset-password` and `/verify/send` are rate limited per IP (`RATE_LIMIT` in the env config). Counters live in the `rate_limit_hits` table, so every app process (pm2 instances, several servers) shares one window. Over the limit: `429` with `resData.error = "too_many_requests"`. If that table can't be reached the request is let through.
- Roles (`roles.code`, with the key the frontend uses):

  | code | role_type | role_key |
  |---|---|---|
  | 1001 | Admin | `admin` |
  | 1002 | Job Provider | `job_provider` |
  | 1003 | Job Seeker | `job_seeker` |

  Every `role_info` in a response carries `role_key`.
- Role-specific routes use `restrictTo(ROLE_CODES.X)`. Write routes also use `checkApiModuleAccess`, which looks the route pattern up in `api_module_mapping` and checks the role's flags in `role_module_access_mapping` (`POST`→write, `PATCH`/`PUT`→update, `DELETE`→delete, `full_access` grants all). An API with no mapping row is allowed for any logged-in user.
- Sidebar menus come from `menus` + `role_module_access_mapping.menu_access`. The admin has no menu: it manages master data, users, verification and moderation through Swagger/Postman.

### Business rules (summary)

- A provider only reads and changes their own jobs and the applications on them; anything else is a `404`.
- A seeker sees only open jobs in their profile's categories: the primary `job_category_code` plus up to 2 `additional_job_category_codes`. The client can narrow to one of them but never choose another.
- Applying needs a profile with `job_category_code`, `qualification` and `experience_years`; the job must be open, not past `last_date` and in the seeker's category; one live application per job and seeker (enforced under a row lock on the job). A withdrawn application can be made again.
- A seeker can withdraw only while the status is `applied`.
- Hiring past `vacancies` fails with `job_vacancies_filled`. The hire that fills the last vacancy closes the job and returns `job_auto_closed: true`. Leaving `hired` lowers `hired_count` without reopening the job. A job with `hired_count >= vacancies` is always closed.
- A job with live applications can't be deleted (`job_in_use`); close it instead.
- Moving an application to `interview` needs `interview_at` (future) and `interview_mode`, plus `interview_location` for in-person and video; sending `interview` again reschedules. `provider_notes` are never shown to the seeker.
- Files: resumes are PDF/DOC/DOCX up to 5 MB, logos PNG/JPEG/WebP up to 1 MB, both checked by content. A resume is downloadable by its owner, by the provider of a job the seeker applied to, and in candidate search only as below. Logos are public.
- Candidate search lists only seekers with `is_discoverable`; their phone, email and resume are shown only if they also set `share_contact` **and** the provider's institution is verified by the admin.
- Admin takedown closes a job, hides it everywhere and stops its provider from reopening it until it is restored.
- Deleting an account (password required) anonymises the user so the email and phone can register again: a seeker's live applications are withdrawn except hires, saved jobs and the resume removed; a provider's open jobs closed and the logo removed.

---

## Database

### Sync

`app/model/index.js` runs `sequelize.sync({ force: false })` on start: it creates missing tables and never alters existing ones. **Never use `force: true`** (it drops every table).

### Table conventions

- `id` primary key (internal only), snake_case columns, plural table names, `timestamps: false`.
- Audit block on every table: `status`, `created_at`, `created_by`, `modified_at`, `modified_by`, `ip_address`, `deleted`.
- Soft delete everywhere (`deleted = true, status = 'inactive'`); every read filters `deleted = false`.
- Unique values (codes, emails, phones, master names) are unique across all rows, deleted ones included, and duplicate checks look at all rows.
- Other tables are referenced by business code (`jobs.provider_user_code → users.code`, `applications.job_code → jobs.code`, …). Foreign keys are declared only as associations in `model/index.js`.
- Business codes come from `app/helper/code_generator.helper.js`, always inside the insert's transaction: it locks the prefix's `code_sequences` row, so concurrent inserts for the same prefix wait in turn instead of colliding. It also looks at the table's last code, so rows seeded with fixed codes are never handed out again.
- `applications` deliberately has no unique index on (`job_code`, `seeker_user_code`): a withdrawn (soft-deleted) application must not block a new one.
- Money is `DECIMAL(12,2)` (monthly INR) and is returned as a number. Dates without time (`last_date`, `date_of_birth`) are `DATEONLY` strings `YYYY-MM-DD`.
- Tables: `roles`, `users`, `user_otps`, `modules`, `menus`, `role_module_access_mapping`, `api_module_mapping`, `job_categories`, `institution_types`, `states`, `cities`, `provider_profiles`, `seeker_profiles`, `seeker_additional_categories`, `jobs`, `saved_jobs`, `applications`, plus two system tables: `code_sequences` (business-code counters) and `rate_limit_hits` (shared rate-limit counters).

### Migrations

New tables come from `sync`. A change to an existing table needs a migration in `app/migrations/` plus the model change in the same commit:

```bash
npm run db:migrate
npm run db:migrate:status
```

The migrations skip columns that already exist and tables that don't exist yet, so `db:migrate` is safe on a fresh database (where `sync` already created every column) and on a first deploy (where the tables don't exist until the app starts). The deploy workflow runs it on every push.

**Upgrading an existing database to this release:** run `npm run db:migrate`, then `npx sequelize-cli db:seed:all` once. The RBAC seeder adds the new modules, menus and API mappings and grants permissions that `rbac.json` added to existing rows.

### Seeders

`npx sequelize-cli db:seed:all` runs, in order:

| Seeder | Inserts |
|---|---|
| `…000000-insert-default-roles` | Admin, Job Provider, Job Seeker |
| `…000050-insert-code-sequences` | One `code_sequences` row per business-code prefix |
| `…000100-insert-default-users` | Admin user (password from `SEED_ADMIN_PASSWORD`) |
| `…000200-insert-rbac-modules-menus` | Modules, menus, role access and API mappings from `app/data/rbac.json` |
| `…000300` … `…000600` | Job categories (12), institution types (4), states and union territories (36), cities (199) from `app/data/*.json` |
| `…000900-insert-demo-data` | Only with `SEED_DEMO_DATA=true`: 6 providers, 20 seekers, 25 jobs, 45 applications from `app/data/demo_data.json` |

Every seeder uses `queryInterface` only, skips rows that already exist, and its `down` removes only what its `up` inserted:

```bash
npx sequelize-cli db:seed:undo --seed 20260101000900-insert-demo-data.js
```

---

## Adding a new module

Follow BLUEPRINT.md §7 and its "New module checklist":

1. Model in `app/model/<folder>/<name>.model.js`; register it and its associations in `model/index.js`.
2. Joi schemas in `validation.schemas.js` (add every field the route accepts).
3. Service, controller, router; mount the router in `router/index.js` (literal paths before param paths).
4. Swagger in `app/docs/<area>.swagger.js`; check it builds:
   `node -e "const s=require('./app/config/swagger'); console.log(Object.keys(s.paths))"`
5. Add the requests to `edujobs.postman_collection.json`.
6. Seeder / migration as needed, and RBAC rows (`app/data/rbac.json`) for permission-controlled writes.
7. Update the API areas table above.

---

## Postman

Import `edujobs.postman_collection.json`. It has one folder per area and one request per route. Collection auth sends `x-access-token: {{token}}`; public requests (login, register, forgot/reset password, master reads, public jobs, health) use no auth. Upload requests use form-data: pick the file for the `file` field. Running **Users › Login** stores the token in `{{token}}`. Set `{{baseUrl}}` for other environments.

---

## Deployment

A push to `main` runs `.github/workflows/deploy.yml` on a self-hosted runner: `npm ci`, writes `.env` from the `DEV_ENV` repository secret (store the whole `.env` there), runs `db:migrate`, and (re)starts the app with pm2 as `edujobs_api`. Set `UPLOAD_DIR` to a directory outside the checkout so uploaded files survive deploys. Set `NODE_ENV=production` in that `.env` to use `prod.json`, where `TRUST_PROXY` is on so rate limiting sees the real client IP behind a proxy.

---

## Known issues

- **Master names stay reserved after delete:** names are unique across deleted rows too, so a deleted category/state name can't be reused; mark rows inactive instead of deleting them.
- **Verification is informational:** nothing is blocked for an unverified email or phone yet; enforce it (e.g. before applying or posting) once email/SMS delivery is configured.
- **Uploads live on the server's disk:** with several servers, put `UPLOAD_DIR` on shared storage (or move files to object storage).
- **Expired jobs between cron runs:** if `ENABLE_CRON` is off, open jobs past `last_date` stay `open`. They are flagged `is_expired: true` in lists and can't be applied to (`job_expired`).
