const { Op } = require('sequelize');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const masterService = require('../service/master.service');
const { getMeta } = require('../helper/common.helper');

// List filters shared by the four masters; status 'all' means active and inactive rows
const baseMasterWhere = ({ search, status }) => {
    let whereCondition = { deleted: false };

    if (status && status !== 'all') {
        whereCondition.status = status;
    }
    if (search) {
        whereCondition.name = { [Op.like]: `%${search}%` };
    }
    return whereCondition;
};

// ─── Job categories ───────────────────────────────────────────────────────

const getAllJobCategories = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const categories = await masterService.getJobCategories(baseMasterWhere(req.query), page, limit);
        successResponse(res, "Job categories fetched successfully", categories);
    } catch (err) {
        errorResponse(res, 'getAllJobCategories', err);
    }
};

const getSingleJobCategory = async (req, res) => {
    try {
        const category = await masterService.getJobCategoryByCode(req.params.categorycode);
        if (!category) {
            throw new CustomError('job_category_not_found', 404, "Job category not found");
        }
        successResponse(res, "Job category info fetched", category);
    } catch (err) {
        errorResponse(res, 'getSingleJobCategory', err);
    }
};

const createJobCategory = async (req, res) => {
    try {
        if (await masterService.jobCategoryNameExists(req.body.name)) {
            throw new CustomError('job_category_exists', 400, "Job category with this name already exists");
        }
        const category = await masterService.createJobCategory(req.body, getMeta(req));
        successResponse(res, "Job category created successfully", category);
    } catch (err) {
        errorResponse(res, 'createJobCategory', err);
    }
};

const updateJobCategory = async (req, res) => {
    try {
        const { categorycode } = req.params;

        if (req.body.name && await masterService.jobCategoryNameExists(req.body.name, categorycode)) {
            throw new CustomError('job_category_exists', 400, "Job category with this name already exists");
        }

        const category = await masterService.updateJobCategory(categorycode, req.body, getMeta(req));
        if (!category) {
            throw new CustomError('job_category_not_found', 404, "Job category not found");
        }
        successResponse(res, "Job category updated successfully", category);
    } catch (err) {
        errorResponse(res, 'updateJobCategory', err);
    }
};

const deleteJobCategory = async (req, res) => {
    try {
        const { categorycode } = req.params;

        const usage = await masterService.getJobCategoryUsageCount(categorycode);
        if (usage > 0) {
            throw new CustomError('job_category_in_use', 400, "Job category is used by jobs or seeker profiles and can't be deleted; mark it inactive instead");
        }

        const deleted = await masterService.deleteJobCategory(categorycode, getMeta(req));
        if (!deleted) {
            throw new CustomError('job_category_not_found', 404, "Job category not found");
        }
        successResponse(res, "Job category deleted successfully");
    } catch (err) {
        errorResponse(res, 'deleteJobCategory', err);
    }
};

// ─── Institution types ────────────────────────────────────────────────────

const getAllInstitutionTypes = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const types = await masterService.getInstitutionTypes(baseMasterWhere(req.query), page, limit);
        successResponse(res, "Institution types fetched successfully", types);
    } catch (err) {
        errorResponse(res, 'getAllInstitutionTypes', err);
    }
};

const getSingleInstitutionType = async (req, res) => {
    try {
        const type = await masterService.getInstitutionTypeByCode(req.params.typecode);
        if (!type) {
            throw new CustomError('institution_type_not_found', 404, "Institution type not found");
        }
        successResponse(res, "Institution type info fetched", type);
    } catch (err) {
        errorResponse(res, 'getSingleInstitutionType', err);
    }
};

const createInstitutionType = async (req, res) => {
    try {
        if (await masterService.institutionTypeNameExists(req.body.name)) {
            throw new CustomError('institution_type_exists', 400, "Institution type with this name already exists");
        }
        const type = await masterService.createInstitutionType(req.body, getMeta(req));
        successResponse(res, "Institution type created successfully", type);
    } catch (err) {
        errorResponse(res, 'createInstitutionType', err);
    }
};

const updateInstitutionType = async (req, res) => {
    try {
        const { typecode } = req.params;

        if (req.body.name && await masterService.institutionTypeNameExists(req.body.name, typecode)) {
            throw new CustomError('institution_type_exists', 400, "Institution type with this name already exists");
        }

        const type = await masterService.updateInstitutionType(typecode, req.body, getMeta(req));
        if (!type) {
            throw new CustomError('institution_type_not_found', 404, "Institution type not found");
        }
        successResponse(res, "Institution type updated successfully", type);
    } catch (err) {
        errorResponse(res, 'updateInstitutionType', err);
    }
};

const deleteInstitutionType = async (req, res) => {
    try {
        const { typecode } = req.params;

        const usage = await masterService.getInstitutionTypeUsageCount(typecode);
        if (usage > 0) {
            throw new CustomError('institution_type_in_use', 400, "Institution type is used by provider profiles and can't be deleted; mark it inactive instead");
        }

        const deleted = await masterService.deleteInstitutionType(typecode, getMeta(req));
        if (!deleted) {
            throw new CustomError('institution_type_not_found', 404, "Institution type not found");
        }
        successResponse(res, "Institution type deleted successfully");
    } catch (err) {
        errorResponse(res, 'deleteInstitutionType', err);
    }
};

// ─── States ───────────────────────────────────────────────────────────────

const getAllStates = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const states = await masterService.getStates(baseMasterWhere(req.query), page, limit);
        successResponse(res, "States fetched successfully", states);
    } catch (err) {
        errorResponse(res, 'getAllStates', err);
    }
};

const getSingleState = async (req, res) => {
    try {
        const state = await masterService.getStateByCode(req.params.statecode);
        if (!state) {
            throw new CustomError('state_not_found', 404, "State not found");
        }
        successResponse(res, "State info fetched", state);
    } catch (err) {
        errorResponse(res, 'getSingleState', err);
    }
};

const createState = async (req, res) => {
    try {
        if (await masterService.stateNameExists(req.body.name)) {
            throw new CustomError('state_exists', 400, "State with this name already exists");
        }
        const state = await masterService.createState(req.body, getMeta(req));
        successResponse(res, "State created successfully", state);
    } catch (err) {
        errorResponse(res, 'createState', err);
    }
};

const updateState = async (req, res) => {
    try {
        const { statecode } = req.params;

        if (req.body.name && await masterService.stateNameExists(req.body.name, statecode)) {
            throw new CustomError('state_exists', 400, "State with this name already exists");
        }

        const state = await masterService.updateState(statecode, req.body, getMeta(req));
        if (!state) {
            throw new CustomError('state_not_found', 404, "State not found");
        }
        successResponse(res, "State updated successfully", state);
    } catch (err) {
        errorResponse(res, 'updateState', err);
    }
};

const deleteState = async (req, res) => {
    try {
        const { statecode } = req.params;

        const usage = await masterService.getStateUsageCount(statecode);
        if (usage > 0) {
            throw new CustomError('state_in_use', 400, "State has cities, profiles or jobs and can't be deleted; mark it inactive instead");
        }

        const deleted = await masterService.deleteState(statecode, getMeta(req));
        if (!deleted) {
            throw new CustomError('state_not_found', 404, "State not found");
        }
        successResponse(res, "State deleted successfully");
    } catch (err) {
        errorResponse(res, 'deleteState', err);
    }
};

// ─── Cities ───────────────────────────────────────────────────────────────

const getAllCities = async (req, res) => {
    try {
        const { page, limit, state_code } = req.query;

        let whereCondition = baseMasterWhere(req.query);
        if (state_code) {
            whereCondition.state_code = state_code;
        }

        const cities = await masterService.getCities(whereCondition, page, limit);
        successResponse(res, "Cities fetched successfully", cities);
    } catch (err) {
        errorResponse(res, 'getAllCities', err);
    }
};

const getSingleCity = async (req, res) => {
    try {
        const city = await masterService.getCityByCode(req.params.citycode);
        if (!city) {
            throw new CustomError('city_not_found', 404, "City not found");
        }
        successResponse(res, "City info fetched", city);
    } catch (err) {
        errorResponse(res, 'getSingleCity', err);
    }
};

const createCity = async (req, res) => {
    try {
        const { name, state_code } = req.body;

        if (!await masterService.getStateByCode(state_code, true)) {
            throw new CustomError('invalid_state_code', 400, "State not found or inactive");
        }
        if (await masterService.cityNameExists(name, state_code)) {
            throw new CustomError('city_exists', 400, "City with this name already exists in the state");
        }

        const city = await masterService.createCity(req.body, getMeta(req));
        successResponse(res, "City created successfully", city);
    } catch (err) {
        errorResponse(res, 'createCity', err);
    }
};

const updateCity = async (req, res) => {
    try {
        const { citycode } = req.params;
        const { name, state_code } = req.body;

        const existing = await masterService.getCityByCode(citycode);
        if (!existing) {
            throw new CustomError('city_not_found', 404, "City not found");
        }

        if (state_code && !await masterService.getStateByCode(state_code, true)) {
            throw new CustomError('invalid_state_code', 400, "State not found or inactive");
        }

        if (name || state_code) {
            const exists = await masterService.cityNameExists(name || existing.name, state_code || existing.state_code, citycode);
            if (exists) {
                throw new CustomError('city_exists', 400, "City with this name already exists in the state");
            }
        }

        const city = await masterService.updateCity(citycode, req.body, getMeta(req));
        if (!city) {
            throw new CustomError('city_not_found', 404, "City not found");
        }
        successResponse(res, "City updated successfully", city);
    } catch (err) {
        errorResponse(res, 'updateCity', err);
    }
};

const deleteCity = async (req, res) => {
    try {
        const { citycode } = req.params;

        const usage = await masterService.getCityUsageCount(citycode);
        if (usage > 0) {
            throw new CustomError('city_in_use', 400, "City is used by profiles or jobs and can't be deleted; mark it inactive instead");
        }

        const deleted = await masterService.deleteCity(citycode, getMeta(req));
        if (!deleted) {
            throw new CustomError('city_not_found', 404, "City not found");
        }
        successResponse(res, "City deleted successfully");
    } catch (err) {
        errorResponse(res, 'deleteCity', err);
    }
};

module.exports = {
    // Job categories
    getAllJobCategories,
    getSingleJobCategory,
    createJobCategory,
    updateJobCategory,
    deleteJobCategory,
    // Institution types
    getAllInstitutionTypes,
    getSingleInstitutionType,
    createInstitutionType,
    updateInstitutionType,
    deleteInstitutionType,
    // States
    getAllStates,
    getSingleState,
    createState,
    updateState,
    deleteState,
    // Cities
    getAllCities,
    getSingleCity,
    createCity,
    updateCity,
    deleteCity
};
