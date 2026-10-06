/**
 * @swagger
 * tags:
 *   - name: Jobs
 *     description: |
 *       Provider side (`/jobs`): the provider's own jobs only; another provider's job is a 404.
 *       Seeker side (`/openings`): open jobs in the seeker's own category (taken from their profile).
 *       `job_status` (open/closed) is the hiring state; the audit `status` column is not exposed.
 *
 * components:
 *   schemas:
 *     JobProviderJob:
 *       type: object
 *       properties:
 *         code: { type: string, example: "EDJJOB00001" }
 *         title: { type: string, example: "Primary Teacher - English" }
 *         job_type: { type: string, enum: [full_time, part_time, contract, visiting] }
 *         job_category_code: { type: string, example: "EDJCAT00001" }
 *         job_category_name: { type: string, example: "Primary Teacher" }
 *         vacancies: { type: integer, example: 2 }
 *         hired_count: { type: integer, example: 1 }
 *         applicants_count: { type: integer, description: "Live (not withdrawn) applications", example: 2 }
 *         min_qualification: { type: string, nullable: true, example: "B.Ed" }
 *         min_experience_years: { type: integer, example: 1 }
 *         salary_min: { type: number, description: "Monthly, INR", example: 20000 }
 *         salary_max: { type: number, example: 28000 }
 *         state_code: { type: string, example: "EDJSTA00026" }
 *         state_name: { type: string, example: "Uttar Pradesh" }
 *         city_code: { type: string, example: "EDJCTY00150" }
 *         city_name: { type: string, example: "Noida" }
 *         last_date: { type: string, format: date, example: "2026-10-31" }
 *         description: { type: string, nullable: true }
 *         job_status: { type: string, enum: [open, closed] }
 *         is_expired: { type: boolean, description: "last_date is before today", example: false }
 *         created_at: { type: string, format: date-time }
 *         modified_at: { type: string, format: date-time }
 *     JobOpening:
 *       type: object
 *       description: Never contains the provider's phone or email
 *       properties:
 *         code: { type: string, example: "EDJJOB00021" }
 *         title: { type: string, example: "Pre-Primary Teacher" }
 *         job_type: { type: string, enum: [full_time, part_time, contract, visiting] }
 *         job_category_code: { type: string, example: "EDJCAT00001" }
 *         job_category_name: { type: string, example: "Primary Teacher" }
 *         institution_name: { type: string, example: "Riverside International School" }
 *         institution_type_code: { type: string, example: "EDJITY00001" }
 *         institution_type_name: { type: string, example: "School" }
 *         state_code: { type: string, example: "EDJSTA00011" }
 *         state_name: { type: string, example: "Karnataka" }
 *         city_code: { type: string, example: "EDJCTY00064" }
 *         city_name: { type: string, example: "Bengaluru" }
 *         salary_min: { type: number, example: 22000 }
 *         salary_max: { type: number, example: 30000 }
 *         vacancies: { type: integer, example: 1 }
 *         min_qualification: { type: string, nullable: true }
 *         min_experience_years: { type: integer }
 *         last_date: { type: string, format: date }
 *         description: { type: string, nullable: true }
 *         job_status: { type: string, enum: [open] }
 *         already_applied: { type: boolean, description: "This seeker has a live application", example: false }
 *         is_expired: { type: boolean, example: false }
 *         posted_at: { type: string, format: date-time }
 *     JobOpeningDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/JobOpening'
 *         - type: object
 *           properties:
 *             institution_website: { type: string, nullable: true }
 *             institution_about: { type: string, nullable: true }
 *             my_application:
 *               type: object
 *               nullable: true
 *               properties:
 *                 code: { type: string, example: "EDJAPP00005" }
 *                 application_status: { type: string, enum: [applied, shortlisted, interview, hired, rejected] }
 *                 applied_at: { type: string, format: date-time }
 *     JobWrite:
 *       type: object
 *       properties:
 *         job_category_code: { type: string }
 *         title: { type: string }
 *         job_type: { type: string, enum: [full_time, part_time, contract, visiting] }
 *         vacancies: { type: integer, minimum: 1 }
 *         min_qualification: { type: string, nullable: true }
 *         min_experience_years: { type: integer, minimum: 0, default: 0 }
 *         salary_min: { type: number, minimum: 0 }
 *         salary_max: { type: number, description: ">= salary_min" }
 *         state_code: { type: string }
 *         city_code: { type: string, description: "Must belong to state_code" }
 *         last_date: { type: string, format: date, description: "Today or later" }
 *         description: { type: string, nullable: true }
 */

/**
 * @swagger
 * /api/v1/job/jobs:
 *   get:
 *     summary: List own jobs (job_provider only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string }, description: Partial match on title }
 *       - { in: query, name: job_category_code, schema: { type: string } }
 *       - { in: query, name: job_type, schema: { type: string, enum: [full_time, part_time, contract, visiting] } }
 *       - { in: query, name: job_status, schema: { type: string, enum: [open, closed] } }
 *     responses:
 *       200:
 *         description: resData holds data + pagination, newest first
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData:
 *                       type: object
 *                       properties:
 *                         data: { type: array, items: { $ref: '#/components/schemas/JobProviderJob' } }
 *                         pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       400: { description: Invalid query parameters, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   post:
 *     summary: Post a job (job_provider only)
 *     description: The new job is open. Category, state and city must be active, and the city must be in the state.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/JobWrite'
 *               - type: object
 *                 required: [job_category_code, title, job_type, vacancies, salary_min, salary_max, state_code, city_code, last_date]
 *           example: { job_category_code: "EDJCAT00001", title: "Primary Teacher - English", job_type: "full_time", vacancies: 2, min_qualification: "B.Ed", min_experience_years: 1, salary_min: 20000, salary_max: 28000, state_code: "EDJSTA00026", city_code: "EDJCTY00150", last_date: "2026-11-30", description: "Teach English to classes I-V." }
 *     responses:
 *       200:
 *         description: Created; resData is the job
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/JobProviderJob' }
 *       400: { description: "Validation error, invalid_job_category_code, invalid_state_code, invalid_city_code, city_state_mismatch, invalid_salary_range, invalid_last_date", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/job/jobs/{jobid}:
 *   parameters:
 *     - { in: path, name: jobid, required: true, schema: { type: string, example: "EDJJOB00001" }, description: The job's code }
 *   get:
 *     summary: Get an own job (job_provider only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The job
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/JobProviderJob' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found or another provider's job (job_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   patch:
 *     summary: Update an own job (job_provider only)
 *     description: |
 *       Every field optional. `job_status` closes or reopens the job. A job whose hired_count reaches
 *       vacancies is always closed. Reopening needs a free vacancy and a last_date of today or later.
 *       The category can't change while the job has applications.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/JobWrite'
 *               - type: object
 *                 minProperties: 1
 *                 properties:
 *                   job_status: { type: string, enum: [open, closed] }
 *           examples:
 *             close: { value: { job_status: "closed" } }
 *             extend: { value: { last_date: "2026-12-15", vacancies: 3 } }
 *     responses:
 *       200:
 *         description: Updated; resData is the job
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/JobProviderJob' }
 *       400: { description: "Validation error, invalid_*_code, city_state_mismatch, invalid_salary_range, invalid_last_date, job_category_locked, vacancies_below_hired, job_vacancies_filled (reopen), job_expired (reopen)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found or another provider's job (job_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   delete:
 *     summary: Delete an own job (job_provider only, soft delete)
 *     description: Refused with job_in_use while the job has live applications; close it instead.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Deleted, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
 *       400: { description: The job has applications (job_in_use), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found or another provider's job (job_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/job/openings:
 *   get:
 *     summary: Open jobs in the seeker's category (job_seeker only)
 *     description: The category comes from the seeker's profile and can't be chosen by the client.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string }, description: Partial match on title or institution name }
 *       - { in: query, name: institution_type_code, schema: { type: string } }
 *       - { in: query, name: job_type, schema: { type: string, enum: [full_time, part_time, contract, visiting] } }
 *       - { in: query, name: state_code, schema: { type: string } }
 *       - { in: query, name: city_code, schema: { type: string } }
 *     responses:
 *       200:
 *         description: resData holds data + pagination, newest first
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData:
 *                       type: object
 *                       properties:
 *                         data: { type: array, items: { $ref: '#/components/schemas/JobOpening' } }
 *                         pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       400: { description: "Invalid query parameters, or no job category in the profile (profile_incomplete)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job seeker, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/job/openings/{jobid}:
 *   parameters:
 *     - { in: path, name: jobid, required: true, schema: { type: string, example: "EDJJOB00021" }, description: The job's code }
 *   get:
 *     summary: One opening (job_seeker only)
 *     description: Only open jobs in the seeker's category; anything else is a 404.
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The opening, with the seeker's own application if any
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/JobOpeningDetail' }
 *       400: { description: No job category in the profile (profile_incomplete), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job seeker, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: "Not found, closed, or in another category (job_not_found)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
