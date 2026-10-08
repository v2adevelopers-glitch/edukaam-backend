const jwt = require('jsonwebtoken');
const CustomError = require('../lib/custom.error');
const { errorResponse } = require('../lib/response.handler');
const userService = require('../service/user.service');
const rbacService = require('../service/rbac.service');

// JWT from the x-access-token header -> req.user (password stripped by the model's toJSON)
const protect = async (req, res, next) => {
    try {
        const token = req.headers['x-access-token'];
        if (!token) {
            throw new CustomError('token_missing', 401, "Token not provided");
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        } catch (err) {
            throw new CustomError('token_invalid', 401, "Token is invalid or expired");
        }

        const user = await userService.getUserByIdAndRoleCode(decoded.id, decoded.role_code);
        if (!user || user.status !== 'active') {
            throw new CustomError('user_not_active', 401, "User not found or not active");
        }

        // logout, a password change or deactivation bumps token_version and ends older tokens
        if ((decoded.tv || 0) !== user.token_version) {
            throw new CustomError('token_revoked', 401, "Your session has ended, please log in again");
        }

        req.user = user.toJSON();
        next();
    } catch (err) {
        errorResponse(res, 'protect', err);
    }
};

// Must run after protect. Allows only users whose role is one of roleCodes, e.g. restrictTo(ROLE_CODES.ADMIN)
const restrictTo = (...roleCodes) => (req, res, next) => {
    if (!req.user || !roleCodes.includes(req.user.role_code)) {
        return errorResponse(res, 'restrictTo',
            new CustomError('role_access_error', 403, "You do not have permission to access this API"));
    }
    next();
};

// Must run after protect, as route-level middleware (req.route is not set in app.use/router.use).
// The API is identified by its route pattern, e.g. PATCH /api/v1/job/jobs/:jobid,
// so api_module_mapping.api_endpoint must store the same pattern.
const checkApiModuleAccess = async (req, res, next) => {
    try {
        const api_endpoint = req.baseUrl + req.route.path;
        const api_method = req.method.toUpperCase();

        const { mapped, allowed, access } = await rbacService.checkApiAccess(req.user.role_code, api_endpoint, api_method);

        if (!allowed) {
            throw new CustomError('module_access_error', 403, "You do not have permission to access this API");
        }

        if (mapped) req.user.allowedPermission = { ...access };
        next();
    } catch (err) {
        errorResponse(res, 'checkApiModuleAccess', err);
    }
};

module.exports = {
    protect,
    restrictTo,
    checkApiModuleAccess
};
