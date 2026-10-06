const { Op } = require('sequelize');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const jobService = require('../service/job.service');
const profileService = require('../service/profile.service');
const { assertMasterCodes, assertCityInState } = require('../helper/master.helper');
const { getMeta } = require('../helper/common.helper');
const { toDateOnly } = require('../helper/query.helper');
const { visibleOpeningWhere, applyOpeningFilters } = require('../helper/job_filter.helper');

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

// The seeker's categories always come from their profile (primary + additional); the client
// can narrow to one of them but never widen
const getSeekerCategoriesOrThrow = async (userCode, narrowTo) => {
    const codes = await profileService.getSeekerCategoryCodes(userCode);
    if (!codes.length) {
        throw new CustomError('profile_incomplete', 400, "Choose your job category in your profile to see openings");
    }
    if (narrowTo && !codes.includes(narrowTo)) {
        throw new CustomError('category_not_in_profile', 400, "That job category is not one of your profile's categories");
    }
    return narrowTo ? [narrowTo] : codes;
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
        const { page, limit, job_category_code } = req.query;
        const categoryCodes = await getSeekerCategoriesOrThrow(req.user.code, job_category_code);

        let whereCondition = { ...visibleOpeningWhere(), job_category_code: { [Op.in]: categoryCodes } };
        applyOpeningFilters(whereCondition, req.query);

        const openings = await jobService.getOpenings(whereCondition, req.user.code, page, limit);
        successResponse(res, "Openings fetched successfully", openings);
    } catch (err) {
        errorResponse(res, 'getAllOpenings', err);
    }
};

const getSingleOpening = async (req, res) => {
    try {
        const categoryCodes = await getSeekerCategoriesOrThrow(req.user.code);

        // a job in another category is reported as not found: seekers never see other categories
        const opening = await jobService.getOpening({
            ...visibleOpeningWhere(),
            code: req.params.jobid,
            job_category_code: { [Op.in]: categoryCodes }
        }, req.user.code);
        if (!opening) {
            throw new CustomError('job_not_found', 404, "Job not found");
        }

        successResponse(res, "Opening info fetched", opening);
    } catch (err) {
        errorResponse(res, 'getSingleOpening', err);
    }
};

// ─── Saved jobs ───────────────────────────────────────────────────────────

const getSavedJobs = async (req, res) => {
    try {
        const { page, limit } = req.query;

        // closed jobs stay in the list (with their job_status); taken-down and deleted ones don't
        let whereCondition = { deleted: false, status: 'active', taken_down_at: null };

        const saved = await jobService.getSavedJobs(whereCondition, req.user.code, page, limit);
        successResponse(res, "Saved jobs fetched successfully", saved);
    } catch (err) {
        errorResponse(res, 'getSavedJobs', err);
    }
};

const saveJob = async (req, res) => {
    try {
        const { job_code } = req.body;
        const categoryCodes = await getSeekerCategoriesOrThrow(req.user.code);

        // only an opening the seeker can see can be saved
        const opening = await jobService.getOpening({
            ...visibleOpeningWhere(),
            code: job_code,
            job_category_code: { [Op.in]: categoryCodes }
        }, req.user.code);
        if (!opening) {
            throw new CustomError('job_not_found', 404, "Job not found");
        }

        const result = await jobService.saveJob(req.user.code, job_code, getMeta(req));
        successResponse(res, result.created ? "Job saved" : "Job was already saved", { job_code, is_saved: true });
    } catch (err) {
        errorResponse(res, 'saveJob', err);
    }
};

const unsaveJob = async (req, res) => {
    try {
        const removed = await jobService.unsaveJob(req.user.code, req.params.jobid, getMeta(req));
        if (!removed) {
            throw new CustomError('saved_job_not_found', 404, "This job is not in your saved jobs");
        }
        successResponse(res, "Job removed from saved jobs", { job_code: req.params.jobid, is_saved: false });
    } catch (err) {
        errorResponse(res, 'unsaveJob', err);
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
    getSingleOpening,
    // Saved jobs
    getSavedJobs,
    saveJob,
    unsaveJob
};
