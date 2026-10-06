/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Login, self-registration and the current session
 *
 * components:
 *   schemas:
 *     UserInfo:
 *       type: object
 *       properties:
 *         code: { type: string, example: "EDJUSR00002" }
 *         role_code: { type: integer, example: 1002 }
 *         name: { type: string, example: "Greenfield Public School", description: "Person's name for seekers, institution name for providers" }
 *         phone: { type: string, example: "0000100001" }
 *         email: { type: string, example: "hr.greenfield@example.com" }
 *         status: { type: string, enum: [active, inactive] }
 *         email_verified: { type: boolean, example: false }
 *         phone_verified: { type: boolean, example: false }
 *         last_login: { type: string, format: date-time, nullable: true }
 *         created_at: { type: string, format: date-time }
 *     UserRoleInfo:
 *       type: object
 *       properties:
 *         code: { type: integer, example: 1002 }
 *         role_type: { type: string, example: "Job Provider" }
 *         role_key: { type: string, enum: [admin, job_provider, job_seeker], example: "job_provider" }
 *     UserProfileRes:
 *       description: "ProfileProvider for job_provider, ProfileSeeker for job_seeker, null for admin"
 *       nullable: true
 *       oneOf:
 *         - $ref: '#/components/schemas/ProfileProvider'
 *         - $ref: '#/components/schemas/ProfileSeeker'
 */

/**
 * @swagger
 * /api/v1/users/login:
 *   post:
 *     summary: Log in with email or phone (public, no token needed)
 *     description: |
 *       Public, no token needed. Rate limited per IP (429 `too_many_requests`).
 *       Five wrong passwords lock the account. Unknown user and wrong password return the same message.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, description: "Email or 10-digit phone" }
 *               password: { type: string }
 *           example: { username: "hr.greenfield@example.com", password: "<SEED_DEMO_PASSWORD>" }
 *     responses:
 *       200:
 *         description: Token, user, profile and role
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
 *                         token: { type: string, description: "Send as the x-access-token header; valid 24 hours" }
 *                         user_info: { $ref: '#/components/schemas/UserInfo' }
 *                         profile_res: { $ref: '#/components/schemas/UserProfileRes' }
 *                         role_info: { $ref: '#/components/schemas/UserRoleInfo' }
 *       400: { description: "Validation error, invalid credentials, locked or inactive account (auth_error)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Too many login attempts from this IP (too_many_requests), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/register:
 *   post:
 *     summary: Register as a job provider or job seeker (public, no token needed)
 *     description: |
 *       Public, no token needed. Rate limited per IP. Creates the user and an empty profile in one
 *       transaction and does not log the user in. Seekers send `job_category_code`, providers send
 *       `institution_type_code`; the other one is ignored. Email and phone must be unused by any
 *       account, deleted ones included.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_key, name, phone, email, password]
 *             properties:
 *               role_key: { type: string, enum: [job_provider, job_seeker] }
 *               name: { type: string, description: "Person's name (seeker) or institution name (provider)" }
 *               phone: { type: string, pattern: '^[0-9]{10}$' }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, description: "Upper-case, lower-case and a digit" }
 *               job_category_code: { type: string, description: "Required for job_seeker" }
 *               institution_type_code: { type: string, description: "Required for job_provider" }
 *           examples:
 *             seeker:
 *               value: { role_key: "job_seeker", name: "Kiran Patel", phone: "0000300001", email: "kiran.patel@example.com", password: "Secret123", job_category_code: "EDJCAT00001" }
 *             provider:
 *               value: { role_key: "job_provider", name: "Lotus Valley School", phone: "0000300002", email: "hr.lotusvalley@example.com", password: "Secret123", institution_type_code: "EDJITY00001" }
 *     responses:
 *       201:
 *         description: Registered
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     statusCode: { type: integer, example: 201 }
 *                     resData:
 *                       type: object
 *                       properties:
 *                         user_code: { type: string, example: "EDJUSR00028" }
 *                         role_key: { type: string, example: "job_seeker" }
 *       400: { description: "Validation error, email_exists, phone_exists, email_or_phone_exists, invalid_job_category_code, invalid_institution_type_code", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Too many registrations from this IP (too_many_requests), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Current session (user, profile, role and menu in one call)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Everything needed to restore a session
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
 *                         user_info: { $ref: '#/components/schemas/UserInfo' }
 *                         profile_res: { $ref: '#/components/schemas/UserProfileRes' }
 *                         role_info: { $ref: '#/components/schemas/UserRoleInfo' }
 *                         menu_access: { type: array, items: { $ref: '#/components/schemas/RbacMenuNode' } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/unlock:
 *   patch:
 *     summary: Unlock an account locked by failed logins (admin)
 *     description: Clears the failed-login counter of the account, so its owner can log in again. `was_locked` tells whether it had reached the 5-attempt lock.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username: { type: string, description: "Email, phone or user code of the account" }
 *           example: { username: "ritu.saxena@example.com" }
 *     responses:
 *       200:
 *         description: Counter cleared
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
 *                         user_info: { $ref: '#/components/schemas/UserInfo' }
 *                         role_info: { $ref: '#/components/schemas/UserRoleInfo' }
 *                         was_locked: { type: boolean, example: true }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not an admin, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: No such account (user_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/password:
 *   patch:
 *     summary: Change own password
 *     description: Every other session ends; the response carries a new token for this one.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string }
 *               new_password: { type: string, minLength: 8, description: "Upper-case, lower-case and a digit" }
 *           example: { current_password: "Secret123", new_password: "N3wSecret!" }
 *     responses:
 *       200:
 *         description: Changed
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
 *                         token: { type: string, description: "Replaces the token used for this request" }
 *       400: { description: "Validation error, invalid_current_password, password_unchanged", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/logout:
 *   post:
 *     summary: Log out everywhere
 *     description: Ends every session of the user (all devices); their tokens answer 401 token_revoked from now on.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Logged out, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/forgot-password:
 *   post:
 *     summary: Request a password reset code (public, no token needed)
 *     description: |
 *       Public, no token needed. Rate limited per IP. Sends a 6-digit code (valid 10 minutes) to the
 *       email, or by SMS to the phone, given as `username`. The answer is the same whether or not the
 *       account exists. A new code can be requested after 60 seconds.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username: { type: string, description: "Email or 10-digit phone" }
 *           example: { username: "aarav.sharma@example.com" }
 *     responses:
 *       200:
 *         description: Code sent if the account exists
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
 *                         channel: { type: string, enum: [email, phone] }
 *       400: { description: Validation error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Too many code requests from this IP (too_many_requests), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/reset-password:
 *   post:
 *     summary: Set a new password with the reset code (public, no token needed)
 *     description: Public, no token needed. Rate limited per IP. Also clears a failed-login lockout and ends every existing session. A code allows 5 wrong tries.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, otp, new_password]
 *             properties:
 *               username: { type: string }
 *               otp: { type: string, pattern: '^[0-9]{6}$' }
 *               new_password: { type: string, minLength: 8 }
 *           example: { username: "aarav.sharma@example.com", otp: "482913", new_password: "N3wSecret!" }
 *     responses:
 *       200: { description: Password reset, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
 *       400: { description: "Validation error, otp_invalid (wrong, expired or unknown account), otp_attempts_exceeded", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Too many code requests from this IP (too_many_requests), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/verify/send:
 *   post:
 *     summary: Send a code to verify own email or phone
 *     description: Rate limited per IP; one code per channel every 60 seconds. Changing the email or phone later clears its verification.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [channel]
 *             properties:
 *               channel: { type: string, enum: [email, phone] }
 *           example: { channel: "email" }
 *     responses:
 *       200:
 *         description: Code sent
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
 *                         channel: { type: string, enum: [email, phone] }
 *                         destination: { type: string, example: "aarav.sharma@example.com" }
 *       400: { description: "Validation error, already_verified", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: "otp_cooldown (wait before asking again) or too_many_requests", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       503: { description: The code could not be delivered (otp_delivery_failed), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/verify/confirm:
 *   post:
 *     summary: Confirm own email or phone with the code
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [channel, otp]
 *             properties:
 *               channel: { type: string, enum: [email, phone] }
 *               otp: { type: string, pattern: '^[0-9]{6}$' }
 *           example: { channel: "email", otp: "482913" }
 *     responses:
 *       200:
 *         description: Verified
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
 *                         user_info: { $ref: '#/components/schemas/UserInfo' }
 *       400: { description: "Validation error, otp_invalid, otp_attempts_exceeded", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/me/export:
 *   get:
 *     summary: Export own data
 *     description: Everything stored about the user as one JSON document. Seekers get their applications and saved jobs, providers their jobs.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The export
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
 *                         exported_at: { type: string, format: date-time }
 *                         account: { $ref: '#/components/schemas/UserInfo' }
 *                         role_info: { $ref: '#/components/schemas/UserRoleInfo' }
 *                         profile: { $ref: '#/components/schemas/UserProfileRes' }
 *                         applications: { type: array, items: { $ref: '#/components/schemas/ApplicationSeekerRow' }, description: "Seekers only" }
 *                         saved_jobs: { type: array, items: { type: object }, description: "Seekers only" }
 *                         jobs: { type: array, items: { $ref: '#/components/schemas/JobProviderJob' }, description: "Providers only" }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/users/me:
 *   delete:
 *     summary: Delete own account (job_provider or job_seeker)
 *     description: |
 *       Needs the password. Personal data is erased and the account anonymised, so its email and
 *       phone can register again. A seeker's live applications are withdrawn (hires stay, without
 *       contact details) and the resume is deleted; a provider's open jobs are closed and the logo is
 *       deleted. Every session ends. This can't be undone.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *           example: { password: "Secret123" }
 *     responses:
 *       200: { description: Deleted, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
 *       400: { description: "Validation error, invalid_password", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Admin accounts can't be deleted this way, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
