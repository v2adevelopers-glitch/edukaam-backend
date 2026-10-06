const express = require('express');
const adminCtrl = require('../controller/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validation.middleware');
const { adminSchemas } = require('../utils/validation.schemas');
const { ROLE_CODES } = require('../constants/role.constant');
const router = express.Router();

const { protect, restrictTo, checkApiModuleAccess } = authMiddleware;
const admin = restrictTo(ROLE_CODES.ADMIN);

// =====================
// USERS ROUTES
// =====================

router.route("/users")
    .get(protect, admin, validateQuery(adminSchemas.getUsers), adminCtrl.getAllUsers);

router.route("/users/:usercode")
    .get(protect, admin, validateParams(adminSchemas.usercode), adminCtrl.getSingleUser);

router.route("/users/:usercode/status")
    .patch(protect, admin, checkApiModuleAccess, validateParams(adminSchemas.usercode), validateBody(adminSchemas.updateUserStatus), adminCtrl.updateUserStatus);

router.route("/providers/:usercode/verification")
    .patch(protect, admin, checkApiModuleAccess, validateParams(adminSchemas.usercode), validateBody(adminSchemas.updateProviderVerification), adminCtrl.updateProviderVerification);

// =====================
// JOBS ROUTES
// =====================

router.route("/jobs")
    .get(protect, admin, validateQuery(adminSchemas.getJobs), adminCtrl.getAllJobs);

router.route("/jobs/:jobid/moderation")
    .patch(protect, admin, checkApiModuleAccess, validateParams(adminSchemas.jobid), validateBody(adminSchemas.moderateJob), adminCtrl.moderateJob);

// =====================
// STATS ROUTES
// =====================

router.route("/stats")
    .get(protect, admin, adminCtrl.getStats);

module.exports = router;
