const express = require('express');
const publicCtrl = require('../controller/public.controller');
const { validateParams, validateQuery } = require('../middlewares/validation.middleware');
const { publicSchemas } = require('../utils/validation.schemas');
const router = express.Router();

// Everything here is public: no token

// =====================
// PUBLIC JOBS ROUTES
// =====================

router.route("/jobs")
    .get(validateQuery(publicSchemas.getPublicJobs), publicCtrl.getPublicJobs);

router.route("/jobs/:jobid")
    .get(validateParams(publicSchemas.jobid), publicCtrl.getPublicJob);

// =====================
// LOGO ROUTES
// =====================

router.route("/logos/:filename")
    .get(validateParams(publicSchemas.filename), publicCtrl.getLogo);

module.exports = router;
