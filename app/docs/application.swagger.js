/**
 * @swagger
 * tags:
 *   - name: Applications
 *     description: |
 *       Provider side (`/applications`): applications on the provider's own jobs; the only place a
 *       seeker's phone and email are shown. Seeker side (`/my-applications`): the seeker's own
 *       applications; apply and withdraw. `application_status` is the hiring stage.
 *
 * components:
 *   schemas:
 *     ApplicationProviderRow:
 *       type: object
 *       properties:
 *         code: { type: string, example: "EDJAPP00008" }
 *         job_code: { type: string, example: "EDJJOB00002" }
 *         job_title: { type: string, example: "TGT Mathematics" }
 *         job_category_code: { type: string, example: "EDJCAT00002" }
 *         job_category_name: { type: string, example: "Secondary Teacher" }
 *         applicant_code: { type: string, example: "EDJUSR00011" }
 *         applicant_name: { type: string, example: "Neha Singh" }
 *         applicant_phone: { type: string, example: "0000200004" }
 *         applicant_email: { type: string, example: "neha.singh@example.com" }
 *         experience_years: { type: integer, nullable: true, example: 5 }
 *         qualification: { type: string, nullable: true, example: "M.Sc Physics, B.Ed" }
 *         has_resume: { type: boolean }
 *         application_status: { type: string, enum: [applied, shortlisted, interview, hired, rejected] }
 *         applied_at: { type: string, format: date-time }
 *         status_changed_at: { type: string, format: date-time, nullable: true }
 *         interview_at: { type: string, format: date-time, nullable: true }
 *         interview_mode: { type: string, enum: [in_person, phone, video], nullable: true }
 *     ApplicationInterview:
 *       type: object
 *       properties:
 *         interview_at: { type: string, format: date-time, nullable: true }
 *         interview_mode: { type: string, enum: [in_person, phone, video], nullable: true }
 *         interview_location: { type: string, nullable: true, description: "Address or meeting link" }
 *         interview_notes: { type: string, nullable: true, description: "Shown to the seeker" }
 *     ApplicationProviderDetail:
 *       type: object
 *       properties:
 *         code: { type: string, example: "EDJAPP00008" }
 *         job_code: { type: string, example: "EDJJOB00002" }
 *         job_title: { type: string, example: "TGT Mathematics" }
 *         job_status: { type: string, enum: [open, closed] }
 *         vacancies: { type: integer, example: 1 }
 *         hired_count: { type: integer, example: 0 }
 *         application_status: { type: string, enum: [applied, shortlisted, interview, hired, rejected] }
 *         applied_at: { type: string, format: date-time }
 *         status_changed_at: { type: string, format: date-time, nullable: true }
 *         cover_note: { type: string, nullable: true }
 *         provider_notes: { type: string, nullable: true, description: "Private to the provider" }
 *         interview_at: { type: string, format: date-time, nullable: true }
 *         interview_mode: { type: string, enum: [in_person, phone, video], nullable: true }
 *         interview_location: { type: string, nullable: true }
 *         interview_notes: { type: string, nullable: true }
 *         applicant:
 *           type: object
 *           properties:
 *             code: { type: string }
 *             name: { type: string }
 *             phone: { type: string }
 *             email: { type: string }
 *             job_category_code: { type: string }
 *             job_category_name: { type: string }
 *             gender: { type: string, nullable: true }
 *             date_of_birth: { type: string, format: date, nullable: true }
 *             qualification: { type: string, nullable: true }
 *             experience_years: { type: integer, nullable: true }
 *             skills: { type: string, nullable: true }
 *             expected_salary: { type: number, nullable: true }
 *             state_code: { type: string, nullable: true }
 *             state_name: { type: string, nullable: true }
 *             city_code: { type: string, nullable: true }
 *             city_name: { type: string, nullable: true }
 *             about: { type: string, nullable: true }
 *             has_resume: { type: boolean }
 *             resume_name: { type: string, nullable: true }
 *             additional_job_categories: { type: array, items: { type: object, properties: { code: { type: string }, name: { type: string } } } }
 *     ApplicationStatusChange:
 *       type: object
 *       properties:
 *         code: { type: string, example: "EDJAPP00008" }
 *         job_code: { type: string, example: "EDJJOB00002" }
 *         application_status: { type: string, example: "hired" }
 *         previous_status: { type: string, example: "interview" }
 *         status_changed_at: { type: string, format: date-time }
 *         job_status: { type: string, enum: [open, closed], example: "closed" }
 *         vacancies: { type: integer, example: 1 }
 *         hired_count: { type: integer, example: 1 }
 *         job_auto_closed: { type: boolean, description: "true when this hire filled the last vacancy and closed the job", example: true }
 *         rescheduled: { type: boolean, description: "true when 'interview' was sent again to change the interview details", example: false }
 *         interview_at: { type: string, format: date-time, description: "Present when the status is interview" }
 *         interview_mode: { type: string }
 *         interview_location: { type: string, nullable: true }
 *         interview_notes: { type: string, nullable: true }
 *     ApplicationSeekerRow:
 *       type: object
 *       description: Never contains the provider's phone or email
 *       properties:
 *         code: { type: string, example: "EDJAPP00005" }
 *         job_code: { type: string, example: "EDJJOB00021" }
 *         job_title: { type: string, example: "Pre-Primary Teacher" }
 *         job_type: { type: string, enum: [full_time, part_time, contract, visiting] }
 *         job_status: { type: string, enum: [open, closed] }
 *         job_category_name: { type: string, example: "Primary Teacher" }
 *         institution_name: { type: string, example: "Riverside International School" }
 *         institution_type_code: { type: string, example: "EDJITY00001" }
 *         institution_type_name: { type: string, example: "School" }
 *         institution_logo_url: { type: string, nullable: true }
 *         institution_verified: { type: boolean }
 *         state_code: { type: string }
 *         state_name: { type: string, example: "Karnataka" }
 *         city_code: { type: string }
 *         city_name: { type: string, example: "Bengaluru" }
 *         application_status: { type: string, enum: [applied, shortlisted, interview, hired, rejected] }
 *         applied_at: { type: string, format: date-time }
 *         status_changed_at: { type: string, format: date-time, nullable: true }
 *         interview_at: { type: string, format: date-time, nullable: true }
 *         interview_mode: { type: string, enum: [in_person, phone, video], nullable: true }
 *         interview_location: { type: string, nullable: true }
 *         interview_notes: { type: string, nullable: true }
 *         can_withdraw: { type: boolean, description: "true while application_status is applied" }
 *     ApplicationSeekerDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/ApplicationSeekerRow'
 *         - type: object
 *           properties:
 *             salary_min: { type: number }
 *             salary_max: { type: number }
 *             vacancies: { type: integer }
 *             min_qualification: { type: string, nullable: true }
 *             min_experience_years: { type: integer }
 *             last_date: { type: string, format: date }
 *             description: { type: string, nullable: true }
 *             cover_note: { type: string, nullable: true }
 *     ApplicationStatusBody:
 *       type: object
 *       required: [application_status]
 *       properties:
 *         application_status: { type: string, enum: [shortlisted, interview, hired, rejected] }
 *         interview_at: { type: string, format: date-time, description: "Required for interview; must be in the future" }
 *         interview_mode: { type: string, enum: [in_person, phone, video], description: "Required for interview" }
 *         interview_location: { type: string, description: "Required for in_person and video (address or meeting link)" }
 *         interview_notes: { type: string, description: "Shown to the seeker" }
 */

/**
 * @swagger
 * /api/v1/application/applications:
 *   get:
 *     summary: Applications on own jobs (job_provider only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string }, description: Partial match on applicant name or phone }
 *       - { in: query, name: job_code, schema: { type: string } }
 *       - { in: query, name: application_status, schema: { type: string, enum: [applied, shortlisted, interview, hired, rejected] } }
 *       - { in: query, name: job_category_code, schema: { type: string } }
 *     responses:
 *       200:
 *         description: resData holds data + pagination, latest first
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
 *                         data: { type: array, items: { $ref: '#/components/schemas/ApplicationProviderRow' } }
 *                         pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       400: { description: Invalid query parameters, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/application/applications/{applicationid}:
 *   parameters:
 *     - { in: path, name: applicationid, required: true, schema: { type: string, example: "EDJAPP00008" }, description: The application's code }
 *   get:
 *     summary: One application with the applicant's full profile (job_provider only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The application
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/ApplicationProviderDetail' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found or on another provider's job (application_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   patch:
 *     summary: Change an application's status (job_provider only)
 *     description: |
 *       Moving to `hired` fails with job_vacancies_filled when hired_count has reached vacancies;
 *       otherwise hired_count goes up, and when it reaches vacancies the job is closed and
 *       `job_auto_closed` is true. Leaving `hired` lowers hired_count (the job is not reopened).
 *       An application can't be moved back to `applied`. Moving to `interview` needs the interview
 *       details; sending `interview` again for an interview application reschedules it.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ApplicationStatusBody' }
 *           examples:
 *             hire: { value: { application_status: "hired" } }
 *             interview: { value: { application_status: "interview", interview_at: "2026-10-20T10:30:00+05:30", interview_mode: "in_person", interview_location: "Plot 12, Sector 62, Noida", interview_notes: "Bring your certificates" } }
 *     responses:
 *       200:
 *         description: Status changed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/ApplicationStatusChange' }
 *       400: { description: "Validation error, application_status_unchanged, job_vacancies_filled", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found or on another provider's job (application_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/application/my-applications:
 *   get:
 *     summary: Own applications (job_seeker only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string }, description: Partial match on job title }
 *       - { in: query, name: application_status, schema: { type: string, enum: [applied, shortlisted, interview, hired, rejected] } }
 *     responses:
 *       200:
 *         description: resData holds data + pagination, latest first
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
 *                         data: { type: array, items: { $ref: '#/components/schemas/ApplicationSeekerRow' } }
 *                         pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       400: { description: Invalid query parameters, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job seeker, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   post:
 *     summary: Apply to a job (job_seeker only)
 *     description: |
 *       The profile needs job_category_code, qualification and experience_years. The job must be
 *       open, not past its last_date and in the seeker's category, and the seeker must not have a
 *       live application for it. A withdrawn application does not count.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [job_code]
 *             properties:
 *               job_code: { type: string }
 *               cover_note: { type: string, maxLength: 2000, description: "Shown to the provider" }
 *           example: { job_code: "EDJJOB00021", cover_note: "I have 3 years of pre-primary experience." }
 *     responses:
 *       200:
 *         description: Applied; resData is the new application
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/ApplicationSeekerDetail' }
 *       400: { description: "Validation error, profile_incomplete, job_not_open (missing or closed), job_expired, category_mismatch, already_applied", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job seeker, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/application/my-applications/{applicationid}:
 *   parameters:
 *     - { in: path, name: applicationid, required: true, schema: { type: string, example: "EDJAPP00005" }, description: The application's code }
 *   get:
 *     summary: One own application (job_seeker only)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The application with job details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/ApplicationSeekerDetail' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job seeker, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found or another seeker's (application_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   delete:
 *     summary: Withdraw an own application (job_seeker only, soft delete)
 *     description: Allowed only while application_status is applied. The seeker may apply again afterwards.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Withdrawn, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
 *       400: { description: The provider already acted on it (application_not_withdrawable), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job seeker, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found or another seeker's (application_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/application/applications/export:
 *   get:
 *     summary: Download applicants on own jobs as CSV (job_provider only)
 *     description: Same filters as the list, no pagination (at most 5000 rows). Returns text/csv (UTF-8 with BOM) as an attachment, not the JSON envelope; errors use the envelope.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: job_code, schema: { type: string } }
 *       - { in: query, name: application_status, schema: { type: string, enum: [applied, shortlisted, interview, hired, rejected] } }
 *       - { in: query, name: job_category_code, schema: { type: string } }
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema: { type: string }
 *       400: { description: Invalid query parameters, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/application/applications/bulk-status:
 *   patch:
 *     summary: Change the status of many applications (job_provider only)
 *     description: |
 *       Up to 100 codes. Each one is processed like a single status change, in the order given, so
 *       hiring stops at the vacancy limit. A failed item doesn't stop the others; see `results`.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/ApplicationStatusBody'
 *               - type: object
 *                 required: [application_codes]
 *                 properties:
 *                   application_codes: { type: array, minItems: 1, maxItems: 100, uniqueItems: true, items: { type: string } }
 *           example: { application_codes: ["EDJAPP00008", "EDJAPP00009"], application_status: "rejected" }
 *     responses:
 *       200:
 *         description: Per-item results
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
 *                         updated: { type: integer, example: 1 }
 *                         failed: { type: integer, example: 1 }
 *                         results:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               code: { type: string }
 *                               success: { type: boolean }
 *                               job_code: { type: string }
 *                               job_auto_closed: { type: boolean }
 *                               error: { type: string, example: "job_vacancies_filled" }
 *                               message: { type: string }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/application/applications/{applicationid}/notes:
 *   parameters:
 *     - { in: path, name: applicationid, required: true, schema: { type: string, example: "EDJAPP00008" } }
 *   patch:
 *     summary: Save private notes on an application (job_provider only)
 *     description: Only the provider who owns the job sees them; null or "" clears them.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider_notes]
 *             properties:
 *               provider_notes: { type: string, nullable: true, maxLength: 5000 }
 *           example: { provider_notes: "Strong demo lesson; check references" }
 *     responses:
 *       200:
 *         description: Saved
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
 *                         code: { type: string }
 *                         provider_notes: { type: string, nullable: true }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found or on another provider's job (application_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/application/applications/{applicationid}/resume:
 *   parameters:
 *     - { in: path, name: applicationid, required: true, schema: { type: string, example: "EDJAPP00008" } }
 *   get:
 *     summary: Download the applicant's resume (job_provider only)
 *     description: Only for an application on the provider's own job. The file itself, not the JSON envelope; errors use the envelope.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The file
 *         content:
 *           application/octet-stream:
 *             schema: { type: string, format: binary }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: "application_not_found or resume_not_found", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
