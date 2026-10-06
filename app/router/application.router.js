const express = require('express');
const applicationCtrl = require('../controller/application.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validation.middleware');
const { applicationSchemas } = require('../utils/validation.schemas');
const { ROLE_CODES } = require('../constants/role.constant');
const router = express.Router();

const { protect, restrictTo, checkApiModuleAccess } = authMiddleware;
const provider = restrictTo(ROLE_CODES.JOB_PROVIDER);
const seeker = restrictTo(ROLE_CODES.JOB_SEEKER);

// =====================
// PROVIDER APPLICATIONS ROUTES
// =====================

router.route("/applications")
    .get(protect, provider, validateQuery(applicationSchemas.getApplications), applicationCtrl.getAllApplications);

router.route("/applications/:applicationid")
    .get(protect, provider, validateParams(applicationSchemas.applicationid), applicationCtrl.getSingleApplication)
    .patch(protect, provider, checkApiModuleAccess, validateParams(applicationSchemas.applicationid), validateBody(applicationSchemas.updateApplicationStatus), applicationCtrl.updateApplicationStatus);

router.route("/applications/:applicationid/resume")
    .get(protect, provider, validateParams(applicationSchemas.applicationid), applicationCtrl.downloadApplicantResume);

// =====================
// SEEKER APPLICATIONS ROUTES
// =====================

router.route("/my-applications")
    .get(protect, seeker, validateQuery(applicationSchemas.getMyApplications), applicationCtrl.getMyApplications)
    .post(protect, seeker, checkApiModuleAccess, validateBody(applicationSchemas.createApplication), applicationCtrl.applyToJob);

router.route("/my-applications/:applicationid")
    .get(protect, seeker, validateParams(applicationSchemas.applicationid), applicationCtrl.getMyApplication)
    .delete(protect, seeker, checkApiModuleAccess, validateParams(applicationSchemas.applicationid), applicationCtrl.withdrawApplication);

module.exports = router;
