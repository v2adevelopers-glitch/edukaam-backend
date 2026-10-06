/**
 * @swagger
 * tags:
 *   - name: Public
 *     description: No token needed. Open, unexpired jobs for the landing page and search engines, and institution logos.
 */

/**
 * @swagger
 * /api/v1/public/jobs:
 *   get:
 *     summary: Public job list (public, no token needed)
 *     description: Open jobs whose last date hasn't passed, newest first. No contact details and no seeker-specific flags.
 *     tags: [Public]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string }, description: Partial match on title or institution name }
 *       - { in: query, name: job_category_code, schema: { type: string } }
 *       - { in: query, name: institution_type_code, schema: { type: string } }
 *       - { in: query, name: job_type, schema: { type: string, enum: [full_time, part_time, contract, visiting] } }
 *       - { in: query, name: state_code, schema: { type: string } }
 *       - { in: query, name: city_code, schema: { type: string } }
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
 *                         data: { type: array, items: { $ref: '#/components/schemas/JobOpening' } }
 *                         pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       400: { description: Invalid query parameters, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/public/jobs/{jobid}:
 *   parameters:
 *     - { in: path, name: jobid, required: true, schema: { type: string, example: "EDJJOB00021" } }
 *   get:
 *     summary: One public job (public, no token needed)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: The job with institution website and about
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData:
 *                       allOf:
 *                         - $ref: '#/components/schemas/JobOpening'
 *                         - type: object
 *                           properties:
 *                             institution_website: { type: string, nullable: true }
 *                             institution_about: { type: string, nullable: true }
 *       404: { description: "Not found, closed or expired (job_not_found)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/public/logos/{filename}:
 *   parameters:
 *     - { in: path, name: filename, required: true, schema: { type: string, example: "3f1c2b7e-9a4d-4c55-8f0e-2d7b1a6c9e10.png" } }
 *   get:
 *     summary: Institution logo image (public, no token needed)
 *     description: Use the `logo_url` / `institution_logo_url` from responses. Cacheable; the name changes when the logo does.
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: The image
 *         content:
 *           image/png: { schema: { type: string, format: binary } }
 *           image/jpeg: { schema: { type: string, format: binary } }
 *           image/webp: { schema: { type: string, format: binary } }
 *       400: { description: Not a valid logo file name, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: No such logo (logo_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
