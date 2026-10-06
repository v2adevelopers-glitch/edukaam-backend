const express = require('express');
const dashboardCtrl = require('../controller/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { ROLE_CODES } = require('../constants/role.constant');
const router = express.Router();

const { protect, restrictTo } = authMiddleware;

// =====================
// DASHBOARD ROUTES
// =====================

router.route("/provider")
    .get(protect, restrictTo(ROLE_CODES.JOB_PROVIDER), dashboardCtrl.getProviderDashboard);

router.route("/seeker")
    .get(protect, restrictTo(ROLE_CODES.JOB_SEEKER), dashboardCtrl.getSeekerDashboard);

module.exports = router;
