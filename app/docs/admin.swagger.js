/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: User management, institution verification, job moderation and platform stats (admin only)
 *
 * components:
 *   schemas:
 *     AdminUser:
 *       allOf:
 *         - $ref: '#/components/schemas/UserInfo'
 *         - type: object
 *           properties:
 *             role_key: { type: string, enum: [admin, job_provider, job_seeker] }
 *             failed_login_attempts: { type: integer }
 *             locked: { type: boolean }
 *             institution_name: { type: string, nullable: true }
 *             institution_verified: { type: boolean, nullable: true, description: "Providers only (null for others)" }
 *     AdminJob:
 *       allOf:
 *         - $ref: '#/components/schemas/JobProviderJob'
 *         - type: object
 *           properties:
 *             provider_user_code: { type: string }
 *             institution_name: { type: string, nullable: true }
 *             taken_down_at: { type: string, format: date-time, nullable: true }
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List users (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string }, description: "Name, email, phone or code" }
 *       - { in: query, name: role_key, schema: { type: string, enum: [admin, job_provider, job_seeker] } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, inactive] } }
 *       - { in: query, name: locked, schema: { type: boolean }, description: Locked after 5 failed logins }
 *       - { in: query, name: verified, schema: { type: boolean }, description: Providers whose institution is (not) verified }
 *     responses:
 *       200:
 *         description: resData holds data + pagination
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
 *                         data: { type: array, items: { $ref: '#/components/schemas/AdminUser' } }
 *                         pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       400: { description: Invalid query parameters, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/admin/users/{usercode}:
 *   parameters:
 *     - { in: path, name: usercode, required: true, schema: { type: string, example: "EDJUSR00002" } }
 *   get:
 *     summary: One user with profile and activity (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User, profile and counts
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
 *                         user_info: { $ref: '#/components/schemas/AdminUser' }
 *                         profile_res: { $ref: '#/components/schemas/UserProfileRes' }
 *                         activity:
 *                           type: object
 *                           properties:
 *                             jobs_posted: { type: integer }
 *                             open_jobs: { type: integer }
 *                             applications_made: { type: integer }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found (user_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/admin/users/{usercode}/status:
 *   parameters:
 *     - { in: path, name: usercode, required: true, schema: { type: string, example: "EDJUSR00009" } }
 *   patch:
 *     summary: Activate or deactivate a user (admin)
 *     description: Deactivating ends the user's sessions and blocks login. The admin can't change their own status.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, inactive] }
 *           example: { status: "inactive" }
 *     responses:
 *       200:
 *         description: Updated
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
 *                         user_info: { $ref: '#/components/schemas/AdminUser' }
 *       400: { description: "Validation error, cannot_change_own_status", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found (user_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/admin/providers/{usercode}/verification:
 *   parameters:
 *     - { in: path, name: usercode, required: true, schema: { type: string, example: "EDJUSR00002" } }
 *   patch:
 *     summary: Verify or un-verify an institution (admin)
 *     description: Verified institutions show a badge on their jobs and may see the contact details of candidates who share them.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_verified]
 *             properties:
 *               is_verified: { type: boolean }
 *           example: { is_verified: true }
 *     responses:
 *       200:
 *         description: Updated
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
 *                         user_info: { $ref: '#/components/schemas/AdminUser' }
 *       400: { description: "Validation error, not_a_provider", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found (user_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/admin/jobs:
 *   get:
 *     summary: List all jobs for moderation (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string }, description: Title or institution name }
 *       - { in: query, name: provider_user_code, schema: { type: string } }
 *       - { in: query, name: job_category_code, schema: { type: string } }
 *       - { in: query, name: job_status, schema: { type: string, enum: [open, closed] } }
 *       - { in: query, name: taken_down, schema: { type: boolean } }
 *     responses:
 *       200:
 *         description: resData holds data + pagination
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
 *                         data: { type: array, items: { $ref: '#/components/schemas/AdminJob' } }
 *                         pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       400: { description: Invalid query parameters, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/admin/jobs/{jobid}/moderation:
 *   parameters:
 *     - { in: path, name: jobid, required: true, schema: { type: string, example: "EDJJOB00001" } }
 *   patch:
 *     summary: Take down or restore a job (admin)
 *     description: |
 *       `takedown` (reason required) closes the job, hides it everywhere and stops its provider from
 *       reopening it; the provider sees the reason. `restore` lifts that; the job stays closed until
 *       its provider reopens it.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [takedown, restore] }
 *               reason: { type: string, minLength: 5, maxLength: 500, description: "Required for takedown" }
 *           example: { action: "takedown", reason: "Salary range is misleading" }
 *     responses:
 *       200:
 *         description: Updated job
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/AdminJob' }
 *       400: { description: "Validation error, job_already_taken_down, job_not_taken_down", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found (job_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Platform counts (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counts
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
 *                         users:
 *                           type: object
 *                           properties:
 *                             job_providers: { type: integer }
 *                             job_providers_active: { type: integer }
 *                             verified_providers: { type: integer }
 *                             job_seekers: { type: integer }
 *                             job_seekers_active: { type: integer }
 *                             locked: { type: integer }
 *                             registered_last_30_days: { type: integer }
 *                         jobs:
 *                           type: object
 *                           properties:
 *                             total: { type: integer }
 *                             open: { type: integer }
 *                             closed: { type: integer }
 *                             taken_down: { type: integer }
 *                             posted_last_30_days: { type: integer }
 *                         applications:
 *                           type: object
 *                           properties:
 *                             total: { type: integer }
 *                             applied_last_30_days: { type: integer }
 *                             applications_by_status: { type: array, items: { $ref: '#/components/schemas/DashboardStatusCount' } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
