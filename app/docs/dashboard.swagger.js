/**
 * @swagger
 * tags:
 *   - name: Dashboard
 *     description: Counters and short lists for the provider and seeker home pages
 *
 * components:
 *   schemas:
 *     DashboardStatusCount:
 *       type: object
 *       properties:
 *         application_status: { type: string, enum: [applied, shortlisted, interview, hired, rejected] }
 *         count: { type: integer, example: 2 }
 *     DashboardProvider:
 *       type: object
 *       properties:
 *         open_jobs: { type: integer, example: 4 }
 *         total_applicants: { type: integer, description: "Live applications on own jobs", example: 7 }
 *         shortlisted: { type: integer, example: 2 }
 *         hired: { type: integer, example: 2 }
 *         applications_by_status:
 *           type: array
 *           description: All five statuses in a fixed order, zero-filled
 *           items: { $ref: '#/components/schemas/DashboardStatusCount' }
 *         applicants_per_job:
 *           type: array
 *           description: Top 5 own jobs by applicants
 *           items:
 *             type: object
 *             properties:
 *               job_code: { type: string, example: "EDJJOB00002" }
 *               job_title: { type: string, example: "TGT Mathematics" }
 *               job_status: { type: string, enum: [open, closed] }
 *               applicants_count: { type: integer, example: 3 }
 *         recent_applicants:
 *           type: array
 *           description: Latest 5 applications (no phone or email; open the application for contact details)
 *           items:
 *             type: object
 *             properties:
 *               application_code: { type: string, example: "EDJAPP00008" }
 *               application_status: { type: string }
 *               applied_at: { type: string, format: date-time }
 *               job_code: { type: string }
 *               job_title: { type: string }
 *               applicant_code: { type: string }
 *               applicant_name: { type: string, example: "Neha Singh" }
 *               qualification: { type: string, nullable: true }
 *               experience_years: { type: integer, nullable: true }
 *     DashboardSeeker:
 *       type: object
 *       properties:
 *         applications_sent: { type: integer, example: 3 }
 *         shortlisted: { type: integer, example: 0 }
 *         hired: { type: integer, example: 1 }
 *         applications_by_status:
 *           type: array
 *           items: { $ref: '#/components/schemas/DashboardStatusCount' }
 *         newest_jobs:
 *           type: array
 *           description: 5 newest open, unexpired jobs in the seeker's category (empty without a category)
 *           items: { $ref: '#/components/schemas/JobOpening' }
 */

/**
 * @swagger
 * /api/v1/dashboard/provider:
 *   get:
 *     summary: Provider dashboard (job_provider only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counters and lists
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/DashboardProvider' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job provider, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */

/**
 * @swagger
 * /api/v1/dashboard/seeker:
 *   get:
 *     summary: Seeker dashboard (job_seeker only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counters and newest jobs
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData: { $ref: '#/components/schemas/DashboardSeeker' }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Not a job seeker, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
