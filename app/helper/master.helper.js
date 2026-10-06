const CustomError = require('../lib/custom.error');
const masterService = require('../service/master.service');

// Every master code a client writes must point at an active row. Pass only the codes being
// written; undefined and null are skipped (null clears an optional column).
exports.assertMasterCodes = async ({ job_category_code, institution_type_code, state_code, city_code }) => {
    if (job_category_code) {
        const category = await masterService.getJobCategoryByCode(job_category_code, true);
        if (!category) {
            throw new CustomError('invalid_job_category_code', 400, "Job category not found or inactive");
        }
    }
    if (institution_type_code) {
        const type = await masterService.getInstitutionTypeByCode(institution_type_code, true);
        if (!type) {
            throw new CustomError('invalid_institution_type_code', 400, "Institution type not found or inactive");
        }
    }
    if (state_code) {
        const state = await masterService.getStateByCode(state_code, true);
        if (!state) {
            throw new CustomError('invalid_state_code', 400, "State not found or inactive");
        }
    }
    if (city_code) {
        const city = await masterService.getCityByCode(city_code, true);
        if (!city) {
            throw new CustomError('invalid_city_code', 400, "City not found or inactive");
        }
    }
};

// The (effective) city must belong to the (effective) state; no city is always fine
exports.assertCityInState = async (city_code, state_code) => {
    if (!city_code) return;
    const city = await masterService.getCityByCode(city_code);
    if (!city || !state_code || city.state_code !== state_code) {
        throw new CustomError('city_state_mismatch', 400, "The city does not belong to the selected state");
    }
};
