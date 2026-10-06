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
