const express = require('express');
const masterCtrl = require('../controller/master.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validation.middleware');
const { masterSchemas } = require('../utils/validation.schemas');
const { ROLE_CODES } = require('../constants/role.constant');
const { cachePublic } = require('../middlewares/cache.middleware');
const router = express.Router();

// Reads are public (registration and search forms need them before login) and cacheable for
// 5 minutes; writes are admin only
const publicRead = cachePublic(300);
const adminWrite = [authMiddleware.protect, authMiddleware.restrictTo(ROLE_CODES.ADMIN), authMiddleware.checkApiModuleAccess];

// =====================
// JOB CATEGORIES ROUTES
// =====================

router.route("/job-categories")
    .get(publicRead, validateQuery(masterSchemas.getMasters), masterCtrl.getAllJobCategories)
    .post(...adminWrite, validateBody(masterSchemas.createJobCategory), masterCtrl.createJobCategory);

router.route("/job-categories/:categorycode")
    .get(publicRead, validateParams(masterSchemas.categorycode), masterCtrl.getSingleJobCategory)
    .patch(...adminWrite, validateParams(masterSchemas.categorycode), validateBody(masterSchemas.updateJobCategory), masterCtrl.updateJobCategory)
    .delete(...adminWrite, validateParams(masterSchemas.categorycode), masterCtrl.deleteJobCategory);

// =====================
// INSTITUTION TYPES ROUTES
// =====================

router.route("/institution-types")
    .get(publicRead, validateQuery(masterSchemas.getMasters), masterCtrl.getAllInstitutionTypes)
    .post(...adminWrite, validateBody(masterSchemas.createInstitutionType), masterCtrl.createInstitutionType);

router.route("/institution-types/:typecode")
    .get(publicRead, validateParams(masterSchemas.typecode), masterCtrl.getSingleInstitutionType)
    .patch(...adminWrite, validateParams(masterSchemas.typecode), validateBody(masterSchemas.updateInstitutionType), masterCtrl.updateInstitutionType)
    .delete(...adminWrite, validateParams(masterSchemas.typecode), masterCtrl.deleteInstitutionType);

// =====================
// STATES ROUTES
// =====================

router.route("/states")
    .get(publicRead, validateQuery(masterSchemas.getMasters), masterCtrl.getAllStates)
    .post(...adminWrite, validateBody(masterSchemas.createState), masterCtrl.createState);

router.route("/states/:statecode")
    .get(publicRead, validateParams(masterSchemas.statecode), masterCtrl.getSingleState)
    .patch(...adminWrite, validateParams(masterSchemas.statecode), validateBody(masterSchemas.updateState), masterCtrl.updateState)
    .delete(...adminWrite, validateParams(masterSchemas.statecode), masterCtrl.deleteState);

// =====================
// CITIES ROUTES
// =====================

router.route("/cities")
    .get(publicRead, validateQuery(masterSchemas.getCities), masterCtrl.getAllCities)
    .post(...adminWrite, validateBody(masterSchemas.createCity), masterCtrl.createCity);

router.route("/cities/:citycode")
    .get(publicRead, validateParams(masterSchemas.citycode), masterCtrl.getSingleCity)
    .patch(...adminWrite, validateParams(masterSchemas.citycode), validateBody(masterSchemas.updateCity), masterCtrl.updateCity)
    .delete(...adminWrite, validateParams(masterSchemas.citycode), masterCtrl.deleteCity);

module.exports = router;
