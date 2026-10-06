/**
 * @swagger
 * tags:
 *   - name: Profile
 *     description: The logged-in provider's or seeker's own profile
 *
 * components:
 *   schemas:
 *     ProfileProvider:
 *       type: object
 *       properties:
 *         user_code: { type: string, example: "EDJUSR00002" }
 *         institution_name: { type: string, example: "Greenfield Public School" }
 *         institution_type_code: { type: string, example: "EDJITY00001" }
 *         institution_type_name: { type: string, example: "School" }
 *         contact_person: { type: string, nullable: true, example: "Anita Kapoor" }
 *         designation: { type: string, nullable: true, example: "HR Manager" }
 *         established_year: { type: integer, nullable: true, example: 1996 }
 *         website: { type: string, nullable: true, example: null }
 *         about: { type: string, nullable: true }
 *         address: { type: string, nullable: true, example: "Plot 12, Sector 62" }
 *         state_code: { type: string, nullable: true, example: "EDJSTA00026" }
 *         state_name: { type: string, nullable: true, example: "Uttar Pradesh" }
 *         city_code: { type: string, nullable: true, example: "EDJCTY00150" }
 *         city_name: { type: string, nullable: true, example: "Noida" }
 *         pincode: { type: string, nullable: true, example: "201309" }
 *         modified_at: { type: string, format: date-time }
 *     ProfileSeeker:
 *       type: object
 *       properties:
 *         user_code: { type: string, example: "EDJUSR00008" }
 *         job_category_code: { type: string, nullable: true, example: "EDJCAT00001" }
 *         job_category_name: { type: string, nullable: true, example: "Primary Teacher" }
 *         gender: { type: string, nullable: true, enum: [male, female, other] }
 *         date_of_birth: { type: string, format: date, nullable: true, example: "1996-03-14" }
 *         qualification: { type: string, nullable: true, example: "B.Ed, B.A. English" }
 *         experience_years: { type: integer, nullable: true, example: 3 }
 *         skills: { type: string, nullable: true, description: "Comma separated", example: "Phonics, Classroom management" }
 *         expected_salary: { type: number, nullable: true, description: "Monthly, INR", example: 22000 }
 *         state_code: { type: string, nullable: true, example: "EDJSTA00026" }
 *         state_name: { type: string, nullable: true, example: "Uttar Pradesh" }
 *         city_code: { type: string, nullable: true, example: "EDJCTY00150" }
 *         city_name: { type: string, nullable: true, example: "Noida" }
 *         about: { type: string, nullable: true }
 *         modified_at: { type: string, format: date-time }
 *     ProfileProviderResponse:
 *       type: object
 *       properties:
 *         user_info: { $ref: '#/components/schemas/UserInfo' }
 *         profile_res: { $ref: '#/components/schemas/ProfileProvider' }
 *     ProfileSeekerResponse:
 *       type: object
 *       properties:
 *         user_info: { $ref: '#/components/schemas/UserInfo' }
 *         profile_res: { $ref: '#/components/schemas/ProfileSeeker' }
 */

/**
 * @swagger
 * /api/v1/profile/provider/me:
 *   get:
 *     summary: Own provider profile (job_provider only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User and profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/ProfileProviderResponse' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Profile not found (profile_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   patch:
 *     summary: Update own provider profile (job_provider only)
 *     description: |
 *       Accepts the profile fields plus `name`, `phone` and `email` (stored on the user, in the same
 *       transaction). For a provider the user name and `institution_name` are one value: sending either
 *       updates both, and `institution_name` wins if both are sent. Send `null` or "" to clear an
 *       optional field. The city must belong to the state.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name: { type: string }
 *               phone: { type: string, pattern: '^[0-9]{10}$' }
 *               email: { type: string, format: email }
 *               institution_name: { type: string }
 *               institution_type_code: { type: string }
 *               contact_person: { type: string, nullable: true }
 *               designation: { type: string, nullable: true }
 *               established_year: { type: integer, nullable: true }
 *               website: { type: string, format: uri, nullable: true }
 *               about: { type: string, nullable: true }
 *               address: { type: string, nullable: true }
 *               state_code: { type: string, nullable: true }
 *               city_code: { type: string, nullable: true }
 *               pincode: { type: string, pattern: '^[1-9][0-9]{5}$', nullable: true }
 *           example: { contact_person: "Anita Kapoor", designation: "HR Manager", state_code: "EDJSTA00026", city_code: "EDJCTY00150", pincode: "201309" }
 *     responses:
 *       200:
 *         description: Updated user and profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/ProfileProviderResponse' }
 *       400: { description: "Validation error, email_exists, phone_exists, invalid_institution_type_code, invalid_state_code, invalid_city_code, city_state_mismatch", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Profile not found (profile_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/profile/seeker/me:
 *   get:
 *     summary: Own seeker profile (job_seeker only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User and profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/ProfileSeekerResponse' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job seeker, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Profile not found (profile_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   patch:
 *     summary: Update own seeker profile (job_seeker only)
 *     description: |
 *       Accepts the profile fields plus `name`, `phone` and `email` (stored on the user, in the same
 *       transaction). `job_category_code` can be changed but not cleared; it decides which openings
 *       the seeker sees. Applying needs job_category_code, qualification and experience_years.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name: { type: string }
 *               phone: { type: string, pattern: '^[0-9]{10}$' }
 *               email: { type: string, format: email }
 *               job_category_code: { type: string }
 *               gender: { type: string, enum: [male, female, other], nullable: true }
 *               date_of_birth: { type: string, format: date, nullable: true }
 *               qualification: { type: string, nullable: true }
 *               experience_years: { type: integer, minimum: 0, maximum: 60, nullable: true }
 *               skills: { type: string, nullable: true, description: "Comma separated" }
 *               expected_salary: { type: number, nullable: true, description: "Monthly, INR" }
 *               state_code: { type: string, nullable: true }
 *               city_code: { type: string, nullable: true }
 *               about: { type: string, nullable: true }
 *           example: { qualification: "B.Ed, B.A. English", experience_years: 3, skills: "Phonics, Storytelling", expected_salary: 22000, state_code: "EDJSTA00026", city_code: "EDJCTY00150" }
 *     responses:
 *       200:
 *         description: Updated user and profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/ProfileSeekerResponse' }
 *       400: { description: "Validation error, email_exists, phone_exists, invalid_job_category_code, invalid_state_code, invalid_city_code, city_state_mismatch", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job seeker, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Profile not found (profile_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
