/**
 * @swagger
 * tags:
 *   - name: Talent
 *     description: |
 *       Candidate search for job providers. Only seekers who turned on `is_discoverable` are listed,
 *       without contact details. Phone, email and resume are shown only when the seeker also turned on
 *       `share_contact` and the provider's institution is verified by the admin.
 *
 * components:
 *   schemas:
 *     TalentCandidate:
 *       type: object
 *       properties:
 *         code: { type: string, example: "EDJUSR00015" }
 *         name: { type: string, example: "Meera Iyer" }
 *         job_category_code: { type: string, example: "EDJCAT00004" }
 *         job_category_name: { type: string, example: "Professor" }
 *         additional_job_categories: { type: array, items: { type: object, properties: { code: { type: string }, name: { type: string } } } }
 *         qualification: { type: string, nullable: true }
 *         experience_years: { type: integer, nullable: true }
 *         skills: { type: string, nullable: true }
 *         expected_salary: { type: number, nullable: true }
 *         state_code: { type: string, nullable: true }
 *         state_name: { type: string, nullable: true }
 *         city_code: { type: string, nullable: true }
 *         city_name: { type: string, nullable: true }
 *         has_resume: { type: boolean }
 *         updated_at: { type: string, format: date-time }
 *     TalentCandidateDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/TalentCandidate'
 *         - type: object
 *           properties:
 *             gender: { type: string, nullable: true }
 *             about: { type: string, nullable: true }
 *             contact_visible: { type: boolean }
 *             phone: { type: string, nullable: true, description: "Only when contact_visible" }
 *             email: { type: string, nullable: true, description: "Only when contact_visible" }
 *             contact_hidden_reason: { type: string, nullable: true, enum: [candidate_not_sharing, institution_not_verified, null] }
 */

/**
 * @swagger
 * /api/v1/talent/candidates:
 *   get:
 *     summary: Search discoverable candidates (job_provider only)
 *     tags: [Talent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string }, description: "Partial match on name, qualification or skills" }
 *       - { in: query, name: job_category_code, schema: { type: string }, description: Matches the primary or an additional category }
 *       - { in: query, name: state_code, schema: { type: string } }
 *       - { in: query, name: city_code, schema: { type: string } }
 *       - { in: query, name: min_experience_years, schema: { type: integer } }
 *       - { in: query, name: max_expected_salary, schema: { type: number }, description: Candidates without a stated salary also match }
 *     responses:
 *       200:
 *         description: resData holds data + pagination, recently updated first
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
 *                         data: { type: array, items: { $ref: '#/components/schemas/TalentCandidate' } }
 *                         pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       400: { description: Invalid query parameters, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/talent/candidates/{usercode}:
 *   parameters:
 *     - { in: path, name: usercode, required: true, schema: { type: string, example: "EDJUSR00015" } }
 *   get:
 *     summary: One candidate (job_provider only)
 *     tags: [Talent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The candidate; contact details only when contact_visible
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/TalentCandidateDetail' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Not found or not discoverable (candidate_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/talent/candidates/{usercode}/resume:
 *   parameters:
 *     - { in: path, name: usercode, required: true, schema: { type: string, example: "EDJUSR00015" } }
 *   get:
 *     summary: Download a candidate's resume (verified job_provider only)
 *     description: Only when the candidate shares contact details and the provider is verified. The file itself, not the JSON envelope.
 *     tags: [Talent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The file
 *         content:
 *           application/octet-stream:
 *             schema: { type: string, format: binary }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: "Not a job provider, or resume_not_shared", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: "candidate_not_found or resume_not_found", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
