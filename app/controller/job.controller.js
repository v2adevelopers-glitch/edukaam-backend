const { Op } = require('sequelize');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const jobService = require('../service/job.service');
const profileService = require('../service/profile.service');
const { assertMasterCodes, assertCityInState } = require('../helper/master.helper');
const { getMeta } = require('../helper/common.helper');
const { toDateOnly } = require('../helper/query.helper');
const { JOB_STATUS } = require('../constants/job.constant');

// Rules the job service checks under its row lock, reported as { error: name }
const SERVICE_ERRORS = {
    job_not_found: [404, "Job not found"],
    job_in_use: [400, "This job has applications and can't be deleted; close it instead"],
    job_category_locked: [400, "The job category can't change while the job has applications"],
    vacancies_below_hired: [400, "Vacancies can't be lower than the number of people already hired"],
    job_vacancies_filled: [400, "Every vacancy is filled; add vacancies before reopening the job"],
    job_expired: [400, "The last date has passed; set a new last_date to reopen the job"]
};

const throwServiceError = (name) => {
    const [httpCode, message] = SERVICE_ERRORS[name] || [400, name];
    throw new CustomError(name, httpCode, message);
};

const assertSalaryRange = (salaryMin, salaryMax) => {
    if (Number(salaryMax) < Number(salaryMin)) {
        throw new CustomError('invalid_salary_range', 400, "salary_max must be greater than or equal to salary_min");
    }
};

// compared with the DB's date, the same one CURDATE() uses for expiry
const assertLastDateNotPast = async (lastDate) => {
    if (toDateOnly(lastDate) < await jobService.getDbToday()) {
        throw new CustomError('invalid_last_date', 400, "last_date must be today or later");
    }
};

// The seeker's category always comes from their profile, never from the client
const getSeekerCategoryOrThrow = async (userCode) => {
    const profile = await profileService.getSeekerProfileByUserCode(userCode);
    if (!profile || !profile.job_category_code) {
        throw new CustomError('profile_incomplete', 400, "Choose your job category in your profile to see openings");
    }
    return profile.job_category_code;
};

// ─── Provider jobs ────────────────────────────────────────────────────────

const getAllJobs = async (req, res) => {
    try {
        const { page, limit, search, job_category_code, job_type, job_status } = req.query;

        // a provider only ever sees their own jobs
        let whereCondition = { deleted: false, provider_user_code: req.user.code };

        if (job_category_code) {
            whereCondition.job_category_code = job_category_code;
        }
        if (job_type) {
            whereCondition.job_type = job_type;
        }
        if (job_status) {
            whereCondition.job_status = job_status;
        }
        if (search) {
            whereCondition.title = { [Op.like]: `%${search}%` };
        }

        const jobs = await jobService.getProviderJobs(whereCondition, page, limit);
        successResponse(res, "Jobs fetched successfully", jobs);
    } catch (err) {
        errorResponse(res, 'getAllJobs', err);
    }
};

const getSingleJob = async (req, res) => {
    try {
        const job = await jobService.getProviderJob({ code: req.params.jobid, provider_user_code: req.user.code, deleted: false });
        if (!job) {
            throw new CustomError('job_not_found', 404, "Job not found");
        }
        successResponse(res, "Job info fetched", job);
    } catch (err) {
        errorResponse(res, 'getSingleJob', err);
    }
};

const createJob = async (req, res) => {
    try {
        const { job_category_code, state_code, city_code, salary_min, salary_max, last_date } = req.body;

        await assertMasterCodes({ job_category_code, state_code, city_code });
        await assertCityInState(city_code, state_code);
        assertSalaryRange(salary_min, salary_max);
        await assertLastDateNotPast(last_date);

        const job = await jobService.createJob(req.body, req.user.code, getMeta(req));
        successResponse(res, "Job created successfully", job);
    } catch (err) {
        errorResponse(res, 'createJob', err);
    }
};

const updateJob = async (req, res) => {
    try {
        const { jobid } = req.params;
        const body = req.body;

        const existing = await jobService.getProviderJob({ code: jobid, provider_user_code: req.user.code, deleted: false });
        if (!existing) {
            throw new CustomError('job_not_found', 404, "Job not found");
        }

        await assertMasterCodes({ job_category_code: body.job_category_code, state_code: body.state_code, city_code: body.city_code });
        if (body.state_code !== undefined || body.city_code !== undefined) {
            await assertCityInState(body.city_code || existing.city_code, body.state_code || existing.state_code);
        }
        if (body.salary_min !== undefined || body.salary_max !== undefined) {
            assertSalaryRange(
                body.salary_min !== undefined ? body.salary_min : existing.salary_min,
                body.salary_max !== undefined ? body.salary_max : existing.salary_max
            );
        }
        if (body.last_date !== undefined) {
            await assertLastDateNotPast(body.last_date);
        }

        const result = await jobService.updateJob(jobid, req.user.code, body, getMeta(req));
        if (result.error) throwServiceError(result.error);

        successResponse(res, "Job updated successfully", result.data);
    } catch (err) {
        errorResponse(res, 'updateJob', err);
    }
};

const deleteJob = async (req, res) => {
    try {
        const result = await jobService.deleteJob(req.params.jobid, req.user.code, getMeta(req));
        if (result.error) throwServiceError(result.error);

        successResponse(res, "Job deleted successfully");
    } catch (err) {
        errorResponse(res, 'deleteJob', err);
    }
};

// ─── Seeker openings ──────────────────────────────────────────────────────

const getAllOpenings = async (req, res) => {
    try {
        const { page, limit, search, institution_type_code, job_type, state_code, city_code } = req.query;
        const categoryCode = await getSeekerCategoryOrThrow(req.user.code);

        let whereCondition = {
            deleted: false,
            status: 'active',
            job_status: JOB_STATUS.OPEN,
            job_category_code: categoryCode
        };

        if (institution_type_code) {
            whereCondition['$provider.providerProfile.institution_type_code$'] = institution_type_code;
        }
        if (job_type) {
            whereCondition.job_type = job_type;
        }
        if (state_code) {
            whereCondition.state_code = state_code;
        }
        if (city_code) {
            whereCondition.city_code = city_code;
        }
        if (search) {
            whereCondition[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { '$provider.providerProfile.institution_name$': { [Op.like]: `%${search}%` } }
            ];
        }

        const openings = await jobService.getOpenings(whereCondition, req.user.code, page, limit);
        successResponse(res, "Openings fetched successfully", openings);
    } catch (err) {
        errorResponse(res, 'getAllOpenings', err);
    }
};

const getSingleOpening = async (req, res) => {
    try {
        const categoryCode = await getSeekerCategoryOrThrow(req.user.code);

        // a job in another category is reported as not found: seekers never see other categories
        const opening = await jobService.getOpening({
            code: req.params.jobid,
            deleted: false,
            status: 'active',
            job_status: JOB_STATUS.OPEN,
            job_category_code: categoryCode
        }, req.user.code);
        if (!opening) {
            throw new CustomError('job_not_found', 404, "Job not found");
        }

        successResponse(res, "Opening info fetched", opening);
    } catch (err) {
        errorResponse(res, 'getSingleOpening', err);
    }
};

module.exports = {
    // Provider jobs
    getAllJobs,
    getSingleJob,
    createJob,
    updateJob,
    deleteJob,
    // Seeker openings
    getAllOpenings,
    getSingleOpening
};
