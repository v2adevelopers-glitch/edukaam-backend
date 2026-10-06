/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Liveness check for monitors and load balancers
 */

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: API and database status (public, no token needed)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Up
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
 *                         status: { type: string, example: "ok" }
 *                         database: { type: string, example: "up" }
 *                         uptime_seconds: { type: integer, example: 3600 }
 *                         timestamp: { type: string, format: date-time }
 *       503: { description: Database not reachable (database_unavailable), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
