const express = require('express');
const jobCtrl = require('../controller/job.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validation.middleware');
const { jobSchemas } = require('../utils/validation.schemas');
const { ROLE_CODES } = require('../constants/role.constant');
const router = express.Router();

const { protect, restrictTo, checkApiModuleAccess } = authMiddleware;
const provider = restrictTo(ROLE_CODES.JOB_PROVIDER);
const seeker = restrictTo(ROLE_CODES.JOB_SEEKER);

// =====================
// PROVIDER JOBS ROUTES
// =====================

router.route("/jobs")
    .get(protect, provider, validateQuery(jobSchemas.getJobs), jobCtrl.getAllJobs)
    .post(protect, provider, checkApiModuleAccess, validateBody(jobSchemas.createJob), jobCtrl.createJob);

router.route("/jobs/:jobid")
    .get(protect, provider, validateParams(jobSchemas.jobid), jobCtrl.getSingleJob)
    .patch(protect, provider, checkApiModuleAccess, validateParams(jobSchemas.jobid), validateBody(jobSchemas.updateJob), jobCtrl.updateJob)
    .delete(protect, provider, checkApiModuleAccess, validateParams(jobSchemas.jobid), jobCtrl.deleteJob);

// =====================
// SEEKER OPENINGS ROUTES
// =====================

router.route("/openings")
    .get(protect, seeker, validateQuery(jobSchemas.getOpenings), jobCtrl.getAllOpenings);

router.route("/openings/:jobid")
    .get(protect, seeker, validateParams(jobSchemas.jobid), jobCtrl.getSingleOpening);

// =====================
// SEEKER SAVED JOBS ROUTES
// =====================

router.route("/saved-jobs")
    .get(protect, seeker, validateQuery(jobSchemas.getSavedJobs), jobCtrl.getSavedJobs)
    .post(protect, seeker, checkApiModuleAccess, validateBody(jobSchemas.saveJob), jobCtrl.saveJob);

router.route("/saved-jobs/:jobid")
    .delete(protect, seeker, checkApiModuleAccess, validateParams(jobSchemas.jobid), jobCtrl.unsaveJob);

module.exports = router;
