const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const rbacService = require('../service/rbac.service');
const { ROLE_CODES } = require('../constants/role.constant');

// ─── Menu access ──────────────────────────────────────────────────────────

const getMenuAccess = async (req, res) => {
    try {
        const { rolecode } = req.params;

        // a user reads their own role's menu; only the admin may read another role's
        if (rolecode !== req.user.role_code && req.user.role_code !== ROLE_CODES.ADMIN) {
            throw new CustomError('role_access_error', 403, "You can only read the menu of your own role");
        }

        if (!await rbacService.roleExists(rolecode)) {
            throw new CustomError('role_not_found', 404, "Role not found");
        }

        const menu_access = await rbacService.getMenuAccess(rolecode);
        successResponse(res, "Menu access fetched successfully", { menu_access });
    } catch (err) {
        errorResponse(res, 'getMenuAccess', err);
    }
};

module.exports = {
    // Menu access
    getMenuAccess
};
