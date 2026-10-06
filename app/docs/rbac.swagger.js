/**
 * @swagger
 * tags:
 *   - name: RBAC
 *     description: Sidebar menu per role
 *
 * components:
 *   schemas:
 *     RbacMenuNode:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 4 }
 *         name: { type: string, example: "Jobs" }
 *         icon: { type: string, nullable: true, example: "work" }
 *         slug: { type: string, example: "jobs" }
 *         route_to: { type: string, nullable: true, example: null }
 *         children:
 *           type: array
 *           items: { type: object, description: "Same shape as the parent node" }
 *           example:
 *             - { id: 5, name: "Post a Job", icon: "add_circle", slug: "post-job", route_to: "/jobs/add", children: [] }
 *             - { id: 6, name: "My Jobs", icon: "list", slug: "my-jobs", route_to: "/jobs/list", children: [] }
 */

/**
 * @swagger
 * /api/v1/rbac/menu-access/{rolecode}:
 *   parameters:
 *     - { in: path, name: rolecode, required: true, schema: { type: integer, example: 1002 }, description: "1001 admin, 1002 job_provider, 1003 job_seeker" }
 *   get:
 *     summary: Menu tree of a role
 *     description: Menus of the modules the role has menu_access to, ordered by ranking and nested by parent. Users may read only their own role's menu (the admin may read any).
 *     tags: [RBAC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Menu tree
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
 *                         menu_access: { type: array, items: { $ref: '#/components/schemas/RbacMenuNode' } }
 *       400: { description: Invalid role code, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Another role's menu (role_access_error), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       404: { description: Role not found (role_not_found), content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
