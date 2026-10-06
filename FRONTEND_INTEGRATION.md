# EduJobs: frontend integration

This is the contract between the React frontend and this API: every endpoint the frontend uses, with its method, full path, query params, request body and a **real** example `resData` (captured from the API running on the demo seed data), plus the list of changes the frontend needs to move from its demo data layer to the API.

> **Note:** the `edukaam-frontend` repository had no commits when this API was built, so its demo data and `config/apiConfig.ts` could not be compared line by line. The "what the frontend must change" table is built from the placeholder endpoints and field names given in the backend brief. Check each row against the frontend code when wiring it up; anything the demo layer did differently that isn't listed below should be adapted to the shapes in this file, not the other way round.

---

## 1. Basics

| Item | Value |
|---|---|
| Base URL | `http://localhost:8080/api/v1` (dev). Production: `PROD_API_URL` |
| Auth header | `x-access-token: <token>` (not `Authorization: Bearer`) |
| Token lifetime | 24 hours; on `401` send the user to the login page |
| Swagger | `http://localhost:8080/api-docs` |
| Record identifiers | Business codes (`EDJJOB00021`, `EDJAPP00005`, `EDJCAT00001`, …). Path params named `:jobid` / `:applicationid` take the **code** |
| Money | Numbers, monthly INR (`salary_min`, `salary_max`, `expected_salary`) |
| Dates | `last_date`, `date_of_birth`: `"YYYY-MM-DD"`. Timestamps (`applied_at`, `created_at`, …): ISO 8601 UTC |

### Envelope

Every response:

```json
{ "statusCode": 200, "success": true, "message": "Jobs fetched successfully", "resData": { } }
```

Lists always return:

```json
{ "resData": { "data": [ ], "pagination": { "total": 25, "page": 1, "limit": 10, "totalPages": 3 } } }
```

Errors return `success: false`, a message you can show as is, and a stable machine name in `resData.error`:

```json
{
  "statusCode": 400,
  "success": false,
  "message": "You have already applied for this job",
  "resData": {
    "error": "already_applied"
  }
}
```

Validation errors list every problem in `message`:

```json
{
  "statusCode": 400,
  "success": false,
  "message": "\"job_category_code\" is required; \"title\" length must be at least 3 characters long; \"job_type\" is required; \"vacancies\" is required; \"salary_min\" is required; \"salary_max\" is required; \"state_code\" is required; \"city_code\" is required; \"last_date\" is required",
  "resData": {
    "error": "VALIDATION_ERROR"
  }
}
```

| HTTP | `resData.error` examples | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `auth_error`, `already_applied`, `job_in_use`, … | Bad input or a business rule; show `message` |
| 401 | `token_missing`, `token_invalid`, `user_not_active` | Log out / go to login |
| 403 | `role_access_error`, `module_access_error` | Wrong role for this route |
| 404 | `job_not_found`, `application_not_found`, … | Not found **or not yours** (another provider's job is a 404) |
| 429 | `too_many_requests` | Login/register rate limit; ask the user to wait |
| 500 | (`resData: null`) | Server error |

---

## 2. What the frontend must change

### 2.1 Known changes

These come from the placeholder endpoints and fields the demo layer used.

| Area | Demo layer | API |
|---|---|---|
| `config/apiConfig.ts` login | `POST /auth/login` | `POST /users/login` |
| `config/apiConfig.ts` session restore | `GET /auth/verify-token` | `GET /users/me` (user, profile, role **and** menu in one call) |
| `config/apiConfig.ts` menu | menu access endpoint | `GET /rbac/menu-access/:rolecode` (only the caller's own role) |
| `config/apiConfig.ts` register | register endpoint | `POST /users/register` (HTTP `201`; does **not** log in, so redirect to login) |
| `config/apiConfig.ts` provider jobs | jobs endpoints | `/job/jobs`, `/job/jobs/:jobid` |
| `config/apiConfig.ts` seeker openings | openings / find-jobs endpoints | `/job/openings`, `/job/openings/:jobid` |
| `config/apiConfig.ts` applicants | applications endpoints | `/application/applications`, `/application/applications/:applicationid` |
| `config/apiConfig.ts` my applications | my-applications endpoints | `/application/my-applications`, `/application/my-applications/:applicationid` |
| `config/apiConfig.ts` profiles | profile endpoints | `/profile/provider/me`, `/profile/seeker/me` |
| `config/apiConfig.ts` dashboards | dashboard endpoints | `/dashboard/provider`, `/dashboard/seeker` |
| `config/apiConfig.ts` dropdowns | demo lists | `/master/job-categories`, `/master/institution-types`, `/master/states`, `/master/cities?state_code=…` (public, no token) |
| Login payload | `{ email, password }` | `{ username, password }`; `username` is the email **or** the 10-digit phone |
| Job state field | `status` | `job_status`: `open` / `closed`. The audit `status` column (`active`/`inactive`) is never returned on jobs |
| Application state field | `status` | `application_status`: `applied` / `shortlisted` / `interview` / `hired` / `rejected` |
| "Job closed" toast after a hire | decided on the client | `PATCH /application/applications/:applicationid` returns `resData.job_auto_closed: true` when that hire filled the last vacancy and closed the job (plus `job_status`, `hired_count`, `vacancies`) |
| Find Jobs category | chosen by the user | **Not a filter any more**: the API always uses the seeker's own `job_category_code` from the profile. Offer institution type, job type, state, city and search instead |

### 2.2 Check these against the demo data

The demo data could not be inspected (see the note above). Each row states what the API does; change the frontend wherever the demo shape differs.

| Topic | API shape |
|---|---|
| Auth header | `x-access-token: <token>` (not `Authorization: Bearer`) |
| Login response | `resData: { token, user_info, profile_res, role_info }` |
| Role | `role_info.role_key`: `job_provider` / `job_seeker` (`admin` exists but has no UI). Numeric code in `role_info.code` and `user_info.role_code` |
| Identifiers | business `code` on every record (`code`, `job_code`, `applicant_code`, `user_code`); URLs take the code. No numeric `id` is returned except on menu nodes |
| Master values in forms | send codes (`job_category_code`, `institution_type_code`, `state_code`, `city_code`); responses add the matching `*_name` |
| Location | `state_code` + `city_code`, the city must belong to the state; responses add `state_name`, `city_name` |
| Lists | `resData.data` + `resData.pagination`; send `page` and `limit` |
| Provider name | for providers `user_info.name` is the institution name and always equals `profile_res.institution_name` |
| Profile page | `GET /profile/*/me` returns `{ user_info, profile_res }`; name, phone and email live on `user_info` and are edited with the same `PATCH` |
| Skills | one comma-separated string (`"Phonics, Storytelling"`) |
| Money | numbers (`20000`), monthly INR |
| Applicant contact | `applicant_phone` / `applicant_email` appear only in the provider's applications list and detail; never in openings, dashboards or seeker responses |
| Withdraw button | show only when `can_withdraw` is `true` (status still `applied`) |
| Apply button | disable when `already_applied` or `is_expired` is `true`; applying needs `qualification` and `experience_years` in the profile (`400 profile_incomplete` otherwise) |
| Dashboard charts | `applications_by_status` is an array of `{ application_status, count }` for all five statuses in a fixed order |

---

## 3. Endpoints

### 3.1 Users

#### `POST /api/v1/users/login` (public)

Body:

```json
{ "username": "hr.greenfield@example.com", "password": "<SEED_DEMO_PASSWORD>" }
```

`resData` (provider; for a seeker `profile_res` is the seeker profile, for the admin it is `null`):

```json
{
  "token": "<jwt>",
  "user_info": {
    "code": "EDJUSR00002",
    "role_code": 1002,
    "name": "Greenfield Public School",
    "phone": "0000100001",
    "email": "hr.greenfield@example.com",
    "status": "active",
    "last_login": null,
    "created_at": "2026-08-07T12:08:16.000Z"
  },
  "profile_res": {
    "user_code": "EDJUSR00002",
    "institution_name": "Greenfield Public School",
    "institution_type_code": "EDJITY00001",
    "institution_type_name": "School",
    "contact_person": "Anita Kapoor",
    "designation": "HR Manager",
    "established_year": 1996,
    "website": null,
    "about": "CBSE-affiliated co-educational school from nursery to class XII.",
    "address": "Plot 12, Sector 62",
    "state_code": "EDJSTA00026",
    "state_name": "Uttar Pradesh",
    "city_code": "EDJCTY00150",
    "city_name": "Noida",
    "pincode": "201309",
    "modified_at": "2026-08-07T12:08:22.000Z"
  },
  "role_info": {
    "code": 1002,
    "role_type": "Job Provider",
    "role_key": "job_provider"
  }
}
```

Errors: `400 auth_error` ("Invalid credentials", or locked after 5 wrong passwords), `429 too_many_requests`.

#### `POST /api/v1/users/register` (public)

Body (seeker sends `job_category_code`, provider sends `institution_type_code`):

```json
{ "role_key": "job_seeker", "name": "Kiran Patel", "phone": "0000300001", "email": "kiran.patel@example.com", "password": "Secret123", "job_category_code": "EDJCAT00001" }
```

```json
{ "role_key": "job_provider", "name": "Lotus Valley School", "phone": "0000300002", "email": "hr.lotusvalley@example.com", "password": "Secret123", "institution_type_code": "EDJITY00001" }
```

Rules: phone exactly 10 digits; password at least 8 characters with an upper-case letter, a lower-case letter and a digit. Response is HTTP `201`:

```json
{
  "statusCode": 201,
  "success": true,
  "message": "Registration successful, please log in",
  "resData": {
    "user_code": "EDJUSR00028",
    "role_key": "job_seeker"
  }
}
```

Errors: `400 email_exists`, `phone_exists`, `invalid_job_category_code`, `invalid_institution_type_code`, `VALIDATION_ERROR`; `429 too_many_requests`.

#### `GET /api/v1/users/me`

`resData`:

```json
{
  "user_info": {
    "code": "EDJUSR00002",
    "role_code": 1002,
    "name": "Greenfield Public School",
    "phone": "0000100001",
    "email": "hr.greenfield@example.com",
    "status": "active",
    "last_login": "2026-10-06T12:08:22.000Z",
    "created_at": "2026-08-07T12:08:16.000Z"
  },
  "profile_res": {
    "user_code": "EDJUSR00002",
    "institution_name": "Greenfield Public School",
    "institution_type_code": "EDJITY00001",
    "institution_type_name": "School",
    "contact_person": "Anita Kapoor",
    "designation": "HR Manager",
    "established_year": 1996,
    "website": null,
    "about": "CBSE-affiliated co-educational school from nursery to class XII.",
    "address": "Plot 12, Sector 62",
    "state_code": "EDJSTA00026",
    "state_name": "Uttar Pradesh",
    "city_code": "EDJCTY00150",
    "city_name": "Noida",
    "pincode": "201309",
    "modified_at": "2026-08-07T12:08:22.000Z"
  },
  "role_info": {
    "code": 1002,
    "role_type": "Job Provider",
    "role_key": "job_provider"
  },
  "menu_access": [
    {
      "id": 1,
      "name": "Dashboard",
      "icon": "dashboard",
      "slug": "dashboard",
      "route_to": "/",
      "children": []
    },
    {
      "id": 2,
      "name": "Institution Profile",
      "icon": "business",
      "slug": "institution-profile",
      "route_to": "/profile/view",
      "children": []
    },
    {
      "id": 4,
      "name": "Jobs",
      "icon": "work",
      "slug": "jobs",
      "route_to": null,
      "children": [
        {
          "id": 8,
          "name": "Post a Job",
          "icon": "add_circle",
          "slug": "post-job",
          "route_to": "/jobs/add",
          "children": []
        },
        {
          "id": 9,
          "name": "My Jobs",
          "icon": "list",
          "slug": "my-jobs",
          "route_to": "/jobs/list",
          "children": []
        }
      ]
    },
    {
      "id": 5,
      "name": "Applicants",
      "icon": "people",
      "slug": "applicants",
      "route_to": "/applications/list",
      "children": []
    }
  ]
}
```

### 3.2 RBAC

#### `GET /api/v1/rbac/menu-access/:rolecode`

`rolecode`: `1002` (provider) or `1003` (seeker); only your own role. `resData` (seeker):

```json
{
  "menu_access": [
    {
      "id": 1,
      "name": "Dashboard",
      "icon": "dashboard",
      "slug": "dashboard",
      "route_to": "/",
      "children": []
    },
    {
      "id": 3,
      "name": "My Profile",
      "icon": "person",
      "slug": "my-profile",
      "route_to": "/profile/view",
      "children": []
    },
    {
      "id": 6,
      "name": "Find Jobs",
      "icon": "search",
      "slug": "find-jobs",
      "route_to": "/openings/list",
      "children": []
    },
    {
      "id": 7,
      "name": "My Applications",
      "icon": "assignment",
      "slug": "my-applications",
      "route_to": "/my-applications/list",
      "children": []
    }
  ]
}
```

Provider menu: Dashboard `/`, Institution Profile `/profile/view`, Jobs (children: Post a Job `/jobs/add`, My Jobs `/jobs/list`), Applicants `/applications/list`.

### 3.3 Master data (public reads)

Query params for every list: `page` (1), `limit` (default 100, max 500), `search` (name), `status` (`active` default, `inactive`, `all`). Cities also take `state_code`.

#### `GET /api/v1/master/job-categories`

```json
{
  "data": [
    {
      "code": "EDJCAT00005",
      "name": "Coaching Faculty",
      "status": "active"
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 2,
    "totalPages": 6
  }
}
```

#### `GET /api/v1/master/job-categories/:categorycode`

```json
{
  "code": "EDJCAT00001",
  "name": "Primary Teacher",
  "status": "active"
}
```

#### `GET /api/v1/master/institution-types`, `GET /api/v1/master/institution-types/:typecode`

Same shape as job categories (`EDJITY00001` School, `EDJITY00002` College, `EDJITY00003` University, `EDJITY00004` Coaching Institute).

#### `GET /api/v1/master/states`, `GET /api/v1/master/states/:statecode`

Same shape as job categories (36 states and union territories).

#### `GET /api/v1/master/cities?state_code=EDJSTA00026`, `GET /api/v1/master/cities/:citycode`

```json
{
  "data": [
    {
      "code": "EDJCTY00153",
      "name": "Agra",
      "state_code": "EDJSTA00026",
      "state_name": "Uttar Pradesh",
      "status": "active"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 2,
    "totalPages": 8
  }
}
```

Admin-only writes (not used by the frontend): `POST`, `PATCH`, `DELETE` on each master path, e.g.

```json
{
  "code": "EDJCTY00200",
  "name": "Sahibabad",
  "state_code": "EDJSTA00026",
  "state_name": "Uttar Pradesh",
  "status": "active"
}
```

### 3.4 Profile

#### `GET /api/v1/profile/provider/me` (provider)

```json
{
  "user_info": {
    "code": "EDJUSR00002",
    "role_code": 1002,
    "name": "Greenfield Public School",
    "phone": "0000100001",
    "email": "hr.greenfield@example.com",
    "status": "active",
    "last_login": "2026-10-06T12:08:22.000Z",
    "created_at": "2026-08-07T12:08:16.000Z"
  },
  "profile_res": {
    "user_code": "EDJUSR00002",
    "institution_name": "Greenfield Public School",
    "institution_type_code": "EDJITY00001",
    "institution_type_name": "School",
    "contact_person": "Anita Kapoor",
    "designation": "HR Manager",
    "established_year": 1996,
    "website": null,
    "about": "CBSE-affiliated co-educational school from nursery to class XII.",
    "address": "Plot 12, Sector 62",
    "state_code": "EDJSTA00026",
    "state_name": "Uttar Pradesh",
    "city_code": "EDJCTY00150",
    "city_name": "Noida",
    "pincode": "201309",
    "modified_at": "2026-08-07T12:08:22.000Z"
  }
}
```

#### `PATCH /api/v1/profile/provider/me` (provider)

Body: any of `name`, `phone`, `email`, `institution_name`, `institution_type_code`, `contact_person`, `designation`, `established_year`, `website`, `about`, `address`, `state_code`, `city_code`, `pincode`. Send `null` or `""` to clear an optional field. `name` and `institution_name` are one value for providers (`institution_name` wins if both are sent).

```json
{ "website": "https://greenfield.example.com" }
```

`resData`: same shape as the `GET` (`{ user_info, profile_res }`) with the new values:

```json
{
  "user_info": {
    "code": "EDJUSR00002",
    "role_code": 1002,
    "name": "Greenfield Public School",
    "phone": "0000100001",
    "email": "hr.greenfield@example.com",
    "status": "active",
    "last_login": "2026-10-06T12:13:32.000Z",
    "created_at": "2026-08-07T12:08:16.000Z"
  },
  "profile_res": {
    "user_code": "EDJUSR00002",
    "institution_name": "Greenfield Public School",
    "institution_type_code": "EDJITY00001",
    "institution_type_name": "School",
    "contact_person": "Anita Kapoor",
    "designation": "HR Manager",
    "established_year": 1996,
    "website": "https://greenfield.example.com",
    "about": "CBSE-affiliated co-educational school from nursery to class XII.",
    "address": "Plot 12, Sector 62",
    "state_code": "EDJSTA00026",
    "state_name": "Uttar Pradesh",
    "city_code": "EDJCTY00150",
    "city_name": "Noida",
    "pincode": "201309",
    "modified_at": "2026-10-06T12:13:33.000Z"
  }
}
```

Errors: `400 email_exists`, `phone_exists`, `invalid_*_code`, `city_state_mismatch`, `VALIDATION_ERROR`.

#### `GET /api/v1/profile/seeker/me` (seeker)

```json
{
  "user_info": {
    "code": "EDJUSR00008",
    "role_code": 1003,
    "name": "Aarav Sharma",
    "phone": "0000200001",
    "email": "aarav.sharma@example.com",
    "status": "active",
    "last_login": "2026-10-06T12:08:23.000Z",
    "created_at": "2026-08-07T12:08:17.000Z"
  },
  "profile_res": {
    "user_code": "EDJUSR00008",
    "job_category_code": "EDJCAT00001",
    "job_category_name": "Primary Teacher",
    "gender": "male",
    "date_of_birth": "1996-03-14",
    "qualification": "B.Ed, B.A. English",
    "experience_years": 3,
    "skills": "Phonics, Classroom management, Storytelling",
    "expected_salary": 22000,
    "state_code": "EDJSTA00026",
    "state_name": "Uttar Pradesh",
    "city_code": "EDJCTY00150",
    "city_name": "Noida",
    "about": "Primary Teacher with 3 years of experience.",
    "modified_at": "2026-08-07T12:08:22.000Z"
  }
}
```

#### `PATCH /api/v1/profile/seeker/me` (seeker)

Body: any of `name`, `phone`, `email`, `job_category_code`, `gender` (`male`/`female`/`other`), `date_of_birth` (`YYYY-MM-DD`), `qualification`, `experience_years`, `skills` (comma separated), `expected_salary`, `state_code`, `city_code`, `about`.

```json
{ "expected_salary": 24000 }
```

`resData`: `{ user_info, profile_res }` as in the `GET`.

### 3.5 Jobs (provider)

#### `GET /api/v1/job/jobs`

Query: `page`, `limit`, `search` (title), `job_category_code`, `job_type` (`full_time`/`part_time`/`contract`/`visiting`), `job_status` (`open`/`closed`).

```json
{
  "data": [
    {
      "code": "EDJJOB00003",
      "title": "School Bus Driver",
      "job_type": "full_time",
      "job_category_code": "EDJCAT00010",
      "job_category_name": "Driver",
      "vacancies": 2,
      "hired_count": 0,
      "applicants_count": 1,
      "min_qualification": "Heavy vehicle licence",
      "min_experience_years": 5,
      "salary_min": 16000,
      "salary_max": 20000,
      "state_code": "EDJSTA00026",
      "state_name": "Uttar Pradesh",
      "city_code": "EDJCTY00150",
      "city_name": "Noida",
      "last_date": "2026-11-05",
      "description": "Greenfield Public School is hiring: School Bus Driver. 2 vacancies.",
      "job_status": "open",
      "is_expired": false,
      "created_at": "2026-09-10T12:08:22.000Z",
      "modified_at": "2026-09-10T12:08:22.000Z"
    }
  ],
  "pagination": {
    "total": 4,
    "page": 1,
    "limit": 1,
    "totalPages": 4
  }
}
```

#### `GET /api/v1/job/jobs/:jobid`

```json
{
  "code": "EDJJOB00003",
  "title": "School Bus Driver",
  "job_type": "full_time",
  "job_category_code": "EDJCAT00010",
  "job_category_name": "Driver",
  "vacancies": 2,
  "hired_count": 0,
  "applicants_count": 1,
  "min_qualification": "Heavy vehicle licence",
  "min_experience_years": 5,
  "salary_min": 16000,
  "salary_max": 20000,
  "state_code": "EDJSTA00026",
  "state_name": "Uttar Pradesh",
  "city_code": "EDJCTY00150",
  "city_name": "Noida",
  "last_date": "2026-11-05",
  "description": "Greenfield Public School is hiring: School Bus Driver. 2 vacancies.",
  "job_status": "open",
  "is_expired": false,
  "created_at": "2026-09-10T12:08:22.000Z",
  "modified_at": "2026-09-10T12:08:22.000Z"
}
```

#### `POST /api/v1/job/jobs`

```json
{
  "job_category_code": "EDJCAT00001",
  "title": "Primary Teacher - EVS",
  "job_type": "full_time",
  "vacancies": 1,
  "min_qualification": "B.Ed",
  "min_experience_years": 1,
  "salary_min": 20000,
  "salary_max": 26000,
  "state_code": "EDJSTA00026",
  "city_code": "EDJCTY00150",
  "last_date": "2026-11-30",
  "description": "Teach EVS to classes III-V."
}
```

```json
{
  "code": "EDJJOB00026",
  "title": "Primary Teacher - EVS",
  "job_type": "full_time",
  "job_category_code": "EDJCAT00001",
  "job_category_name": "Primary Teacher",
  "vacancies": 1,
  "hired_count": 0,
  "applicants_count": 0,
  "min_qualification": "B.Ed",
  "min_experience_years": 1,
  "salary_min": 20000,
  "salary_max": 26000,
  "state_code": "EDJSTA00026",
  "state_name": "Uttar Pradesh",
  "city_code": "EDJCTY00150",
  "city_name": "Noida",
  "last_date": "2026-11-30",
  "description": "Teach EVS to classes III-V.",
  "job_status": "open",
  "is_expired": false,
  "created_at": "2026-10-06T12:13:33.000Z",
  "modified_at": "2026-10-06T12:13:33.000Z"
}
```

Errors: `400 invalid_salary_range` (`salary_max < salary_min`), `invalid_last_date` (before today), `city_state_mismatch`, `invalid_*_code`.

#### `PATCH /api/v1/job/jobs/:jobid`

Any field of the create body, plus `job_status` (`open`/`closed`) to close or reopen. Example: `{ "vacancies": 1, "last_date": "2026-12-15" }`. `resData` is the job (same shape as above). Errors: `job_vacancies_filled` / `job_expired` when reopening a filled or expired job, `vacancies_below_hired`, `job_category_locked` (category change while it has applications).

#### `DELETE /api/v1/job/jobs/:jobid`

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Job deleted successfully"
}
```

With live applications:

```json
{
  "statusCode": 400,
  "success": false,
  "message": "This job has applications and can't be deleted; close it instead",
  "resData": {
    "error": "job_in_use"
  }
}
```

### 3.6 Openings (seeker)

#### `GET /api/v1/job/openings`

Query: `page`, `limit`, `search` (title or institution name), `institution_type_code`, `job_type`, `state_code`, `city_code`. The category is always the seeker's own. Error `400 profile_incomplete` when the seeker has no category.

```json
{
  "data": [
    {
      "code": "EDJJOB00021",
      "title": "Pre-Primary Teacher",
      "job_type": "full_time",
      "job_category_code": "EDJCAT00001",
      "job_category_name": "Primary Teacher",
      "institution_name": "Riverside International School",
      "institution_type_code": "EDJITY00001",
      "institution_type_name": "School",
      "state_code": "EDJSTA00011",
      "state_name": "Karnataka",
      "city_code": "EDJCTY00064",
      "city_name": "Bengaluru",
      "salary_min": 22000,
      "salary_max": 30000,
      "vacancies": 1,
      "min_qualification": "NTT or B.Ed",
      "min_experience_years": 1,
      "last_date": "2026-11-08",
      "description": "Riverside International School is hiring: Pre-Primary Teacher. 1 vacancy.",
      "job_status": "open",
      "already_applied": true,
      "is_expired": false,
      "posted_at": "2026-09-23T12:08:22.000Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 1,
    "totalPages": 2
  }
}
```

#### `GET /api/v1/job/openings/:jobid`

`my_application` is `null` until the seeker applies.

```json
{
  "code": "EDJJOB00021",
  "title": "Pre-Primary Teacher",
  "job_type": "full_time",
  "job_category_code": "EDJCAT00001",
  "job_category_name": "Primary Teacher",
  "institution_name": "Riverside International School",
  "institution_type_code": "EDJITY00001",
  "institution_type_name": "School",
  "state_code": "EDJSTA00011",
  "state_name": "Karnataka",
  "city_code": "EDJCTY00064",
  "city_name": "Bengaluru",
  "salary_min": 22000,
  "salary_max": 30000,
  "vacancies": 1,
  "min_qualification": "NTT or B.Ed",
  "min_experience_years": 1,
  "last_date": "2026-11-08",
  "description": "Riverside International School is hiring: Pre-Primary Teacher. 1 vacancy.",
  "job_status": "open",
  "already_applied": true,
  "is_expired": false,
  "posted_at": "2026-09-23T12:08:22.000Z",
  "institution_website": null,
  "institution_about": "International curriculum day school with transport facility.",
  "my_application": {
    "code": "EDJAPP00005",
    "application_status": "applied",
    "applied_at": "2026-10-02T12:08:22.000Z"
  }
}
```

### 3.7 Applications (provider)

#### `GET /api/v1/application/applications`

Query: `page`, `limit`, `search` (applicant name or phone), `job_code`, `application_status`, `job_category_code`.

```json
{
  "data": [
    {
      "code": "EDJAPP00008",
      "job_code": "EDJJOB00002",
      "job_title": "TGT Mathematics",
      "job_category_code": "EDJCAT00002",
      "job_category_name": "Secondary Teacher",
      "applicant_code": "EDJUSR00011",
      "applicant_name": "Neha Singh",
      "applicant_phone": "0000200004",
      "applicant_email": "neha.singh@example.com",
      "experience_years": 5,
      "qualification": "M.Sc Physics, B.Ed",
      "application_status": "applied",
      "applied_at": "2026-09-30T12:08:22.000Z",
      "status_changed_at": null
    }
  ],
  "pagination": {
    "total": 7,
    "page": 1,
    "limit": 1,
    "totalPages": 7
  }
}
```

#### `GET /api/v1/application/applications/:applicationid`

```json
{
  "code": "EDJAPP00008",
  "job_code": "EDJJOB00002",
  "job_title": "TGT Mathematics",
  "job_status": "open",
  "vacancies": 1,
  "hired_count": 0,
  "application_status": "applied",
  "applied_at": "2026-09-30T12:08:22.000Z",
  "status_changed_at": null,
  "applicant": {
    "code": "EDJUSR00011",
    "name": "Neha Singh",
    "phone": "0000200004",
    "email": "neha.singh@example.com",
    "job_category_code": "EDJCAT00002",
    "job_category_name": "Secondary Teacher",
    "gender": "female",
    "date_of_birth": "1993-05-09",
    "qualification": "M.Sc Physics, B.Ed",
    "experience_years": 5,
    "skills": "Physics, Lab demonstrations, Smart class",
    "expected_salary": 35000,
    "state_code": "EDJSTA00011",
    "state_name": "Karnataka",
    "city_code": "EDJCTY00064",
    "city_name": "Bengaluru",
    "about": "Secondary Teacher with 5 years of experience."
  }
}
```

#### `PATCH /api/v1/application/applications/:applicationid`

Body: `{ "application_status": "shortlisted" | "interview" | "hired" | "rejected" }`. Hiring the last vacancy:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Application status updated; every vacancy is now filled, so the job was closed",
  "resData": {
    "code": "EDJAPP00046",
    "job_code": "EDJJOB00026",
    "application_status": "hired",
    "previous_status": "applied",
    "status_changed_at": "2026-10-06T12:13:33.407Z",
    "job_status": "closed",
    "vacancies": 1,
    "hired_count": 1,
    "job_auto_closed": true
  }
}
```

Any other change:

```json
{
  "code": "EDJAPP00008",
  "job_code": "EDJJOB00002",
  "application_status": "shortlisted",
  "previous_status": "applied",
  "status_changed_at": "2026-10-06T12:13:33.432Z",
  "job_status": "open",
  "vacancies": 1,
  "hired_count": 0,
  "job_auto_closed": false
}
```

Errors: `400 job_vacancies_filled` (no vacancy left), `application_status_unchanged`, `404 application_not_found`.

### 3.8 Applications (seeker)

#### `GET /api/v1/application/my-applications`

Query: `page`, `limit`, `search` (job title), `application_status`.

```json
{
  "data": [
    {
      "code": "EDJAPP00005",
      "job_code": "EDJJOB00021",
      "job_title": "Pre-Primary Teacher",
      "job_type": "full_time",
      "job_status": "open",
      "job_category_name": "Primary Teacher",
      "institution_name": "Riverside International School",
      "institution_type_code": "EDJITY00001",
      "institution_type_name": "School",
      "state_code": "EDJSTA00011",
      "state_name": "Karnataka",
      "city_code": "EDJCTY00064",
      "city_name": "Bengaluru",
      "application_status": "applied",
      "applied_at": "2026-10-02T12:08:22.000Z",
      "status_changed_at": null,
      "can_withdraw": true
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 1,
    "totalPages": 3
  }
}
```

#### `GET /api/v1/application/my-applications/:applicationid`

```json
{
  "code": "EDJAPP00005",
  "job_code": "EDJJOB00021",
  "job_title": "Pre-Primary Teacher",
  "job_type": "full_time",
  "job_status": "open",
  "job_category_name": "Primary Teacher",
  "institution_name": "Riverside International School",
  "institution_type_code": "EDJITY00001",
  "institution_type_name": "School",
  "state_code": "EDJSTA00011",
  "state_name": "Karnataka",
  "city_code": "EDJCTY00064",
  "city_name": "Bengaluru",
  "application_status": "applied",
  "applied_at": "2026-10-02T12:08:22.000Z",
  "status_changed_at": null,
  "can_withdraw": true,
  "salary_min": 22000,
  "salary_max": 30000,
  "vacancies": 1,
  "min_qualification": "NTT or B.Ed",
  "min_experience_years": 1,
  "last_date": "2026-11-08",
  "description": "Riverside International School is hiring: Pre-Primary Teacher. 1 vacancy."
}
```

#### `POST /api/v1/application/my-applications`

Body: `{ "job_code": "EDJJOB00026" }`. `resData` has the same shape as the detail above:

```json
{
  "code": "EDJAPP00046",
  "job_code": "EDJJOB00026",
  "job_title": "Primary Teacher - EVS",
  "job_type": "full_time",
  "job_status": "open",
  "job_category_name": "Primary Teacher",
  "institution_name": "Greenfield Public School",
  "institution_type_code": "EDJITY00001",
  "institution_type_name": "School",
  "state_code": "EDJSTA00026",
  "state_name": "Uttar Pradesh",
  "city_code": "EDJCTY00150",
  "city_name": "Noida",
  "application_status": "applied",
  "applied_at": "2026-10-06T12:13:33.000Z",
  "status_changed_at": null,
  "can_withdraw": true,
  "salary_min": 20000,
  "salary_max": 26000,
  "vacancies": 1,
  "min_qualification": "B.Ed",
  "min_experience_years": 1,
  "last_date": "2026-12-15",
  "description": "Teach EVS to classes III-V."
}
```

Errors (all `400`): `profile_incomplete` (message lists the missing fields), `job_not_open`, `job_expired`, `category_mismatch`, `already_applied`.

#### `DELETE /api/v1/application/my-applications/:applicationid`

Withdraws (only while `application_status` is `applied`; `400 application_not_withdrawable` otherwise). The seeker can apply to the same job again afterwards.

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Application withdrawn successfully"
}
```

### 3.9 Dashboards

#### `GET /api/v1/dashboard/provider`

```json
{
  "open_jobs": 4,
  "total_applicants": 7,
  "shortlisted": 2,
  "hired": 2,
  "applications_by_status": [
    {
      "application_status": "applied",
      "count": 1
    },
    {
      "application_status": "shortlisted",
      "count": 2
    },
    {
      "application_status": "interview",
      "count": 1
    },
    {
      "application_status": "hired",
      "count": 2
    },
    {
      "application_status": "rejected",
      "count": 1
    }
  ],
  "applicants_per_job": [
    {
      "job_code": "EDJJOB00002",
      "job_title": "TGT Mathematics",
      "job_status": "open",
      "applicants_count": 3
    },
    {
      "job_code": "EDJJOB00001",
      "job_title": "Primary Teacher - English",
      "job_status": "open",
      "applicants_count": 2
    },
    {
      "job_code": "EDJJOB00003",
      "job_title": "School Bus Driver",
      "job_status": "open",
      "applicants_count": 1
    },
    {
      "job_code": "EDJJOB00004",
      "job_title": "Campus Security Guard",
      "job_status": "open",
      "applicants_count": 1
    }
  ],
  "recent_applicants": [
    {
      "application_code": "EDJAPP00008",
      "application_status": "applied",
      "applied_at": "2026-09-30T12:08:22.000Z",
      "job_code": "EDJJOB00002",
      "job_title": "TGT Mathematics",
      "applicant_code": "EDJUSR00011",
      "applicant_name": "Neha Singh",
      "qualification": "M.Sc Physics, B.Ed",
      "experience_years": 5
    },
    {
      "application_code": "EDJAPP00041",
      "application_status": "shortlisted",
      "applied_at": "2026-09-24T12:08:22.000Z",
      "job_code": "EDJJOB00003",
      "job_title": "School Bus Driver",
      "applicant_code": "EDJUSR00025",
      "applicant_name": "Ramesh Pal",
      "qualification": "10th pass, Heavy vehicle licence",
      "experience_years": 15
    },
    {
      "application_code": "EDJAPP00009",
      "application_status": "rejected",
      "applied_at": "2026-09-22T12:08:22.000Z",
      "job_code": "EDJJOB00002",
      "job_title": "TGT Mathematics",
      "applicant_code": "EDJUSR00012",
      "applicant_name": "Ankit Yadav",
      "qualification": "B.Sc, B.Ed",
      "experience_years": 2
    },
    {
      "application_code": "EDJAPP00007",
      "application_status": "interview",
      "applied_at": "2026-09-21T12:08:22.000Z",
      "job_code": "EDJJOB00002",
      "job_title": "TGT Mathematics",
      "applicant_code": "EDJUSR00010",
      "applicant_name": "Rohan Gupta",
      "qualification": "M.Sc Mathematics, B.Ed",
      "experience_years": 7
    },
    {
      "application_code": "EDJAPP00002",
      "application_status": "shortlisted",
      "applied_at": "2026-09-18T12:08:22.000Z",
      "job_code": "EDJJOB00001",
      "job_title": "Primary Teacher - English",
      "applicant_code": "EDJUSR00009",
      "applicant_name": "Priya Verma",
      "qualification": "D.El.Ed, B.Sc",
      "experience_years": 5
    }
  ]
}
```

#### `GET /api/v1/dashboard/seeker`

`newest_jobs` rows have the same shape as openings (5 newest open, unexpired jobs in the seeker's category).

```json
{
  "applications_sent": 3,
  "shortlisted": 0,
  "hired": 1,
  "applications_by_status": [
    {
      "application_status": "applied",
      "count": 1
    },
    {
      "application_status": "shortlisted",
      "count": 0
    },
    {
      "application_status": "interview",
      "count": 0
    },
    {
      "application_status": "hired",
      "count": 1
    },
    {
      "application_status": "rejected",
      "count": 1
    }
  ],
  "newest_jobs": [
    {
      "code": "EDJJOB00021",
      "title": "Pre-Primary Teacher",
      "job_type": "full_time",
      "job_category_code": "EDJCAT00001",
      "job_category_name": "Primary Teacher",
      "institution_name": "Riverside International School",
      "institution_type_code": "EDJITY00001",
      "institution_type_name": "School",
      "state_code": "EDJSTA00011",
      "state_name": "Karnataka",
      "city_code": "EDJCTY00064",
      "city_name": "Bengaluru",
      "salary_min": 22000,
      "salary_max": 30000,
      "vacancies": 1,
      "min_qualification": "NTT or B.Ed",
      "min_experience_years": 1,
      "last_date": "2026-11-08",
      "description": "Riverside International School is hiring: Pre-Primary Teacher. 1 vacancy.",
      "job_status": "open",
      "already_applied": true,
      "is_expired": false,
      "posted_at": "2026-09-23T12:08:22.000Z"
    },
    {
      "code": "EDJJOB00001",
      "title": "Primary Teacher - English",
      "job_type": "full_time",
      "job_category_code": "EDJCAT00001",
      "job_category_name": "Primary Teacher",
      "institution_name": "Greenfield Public School",
      "institution_type_code": "EDJITY00001",
      "institution_type_name": "School",
      "state_code": "EDJSTA00026",
      "state_name": "Uttar Pradesh",
      "city_code": "EDJCTY00150",
      "city_name": "Noida",
      "salary_min": 20000,
      "salary_max": 28000,
      "vacancies": 2,
      "min_qualification": "B.Ed",
      "min_experience_years": 1,
      "last_date": "2026-10-31",
      "description": "Greenfield Public School is hiring: Primary Teacher - English. 2 vacancies.",
      "job_status": "open",
      "already_applied": true,
      "is_expired": false,
      "posted_at": "2026-09-06T12:08:22.000Z"
    }
  ]
}
```
