const { Op } = require('sequelize');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const applicationService = require('../service/application.service');
const profileService = require('../service/profile.service');
const { getMeta } = require('../helper/common.helper');
const { APPLICATION_STATUS, SEEKER_FIELDS_REQUIRED_TO_APPLY } = require('../constants/job.constant');

// Rules the application service checks inside its transaction, reported as { error: name }
const SERVICE_ERRORS = {
    application_not_found: [404, "Application not found"],
    application_status_unchanged: [400, "The application already has this status"],
    job_vacancies_filled: [400, "Every vacancy for this job is already filled"],
    job_not_open: [400, "This job is not open for applications"],
    job_expired: [400, "The last date to apply for this job has passed"],
    category_mismatch: [400, "This job is not in your job category"],
    already_applied: [400, "You have already applied for this job"]
};

const throwServiceError = (name) => {
    const [httpCode, message] = SERVICE_ERRORS[name] || [400, name];
    throw new CustomError(name, httpCode, message);
};

// ─── Provider applications ────────────────────────────────────────────────

const getAllApplications = async (req, res) => {
    try {
        const { page, limit, search, job_code, application_status, job_category_code } = req.query;

        // only applications on the provider's own jobs
        let whereCondition = { deleted: false, '$job.provider_user_code$': req.user.code, '$job.deleted$': false };

        if (job_code) {
            whereCondition.job_code = job_code;
        }
        if (application_status) {
            whereCondition.application_status = application_status;
        }
        if (job_category_code) {
            whereCondition['$job.job_category_code$'] = job_category_code;
        }
        if (search) {
            whereCondition[Op.or] = [
                { '$seeker.name$': { [Op.like]: `%${search}%` } },
                { '$seeker.phone$': { [Op.like]: `%${search}%` } }
            ];
        }

        const applications = await applicationService.getProviderApplications(whereCondition, page, limit);
        successResponse(res, "Applications fetched successfully", applications);
    } catch (err) {
        errorResponse(res, 'getAllApplications', err);
    }
};

const getSingleApplication = async (req, res) => {
    try {
        const application = await applicationService.getProviderApplication({
            code: req.params.applicationid,
            deleted: false,
            '$job.provider_user_code$': req.user.code
        });
        if (!application) {
            throw new CustomError('application_not_found', 404, "Application not found");
        }
        successResponse(res, "Application info fetched", application);
    } catch (err) {
        errorResponse(res, 'getSingleApplication', err);
    }
};

const updateApplicationStatus = async (req, res) => {
    try {
        const result = await applicationService.updateApplicationStatus(
            req.params.applicationid,
            req.user.code,
            req.body.application_status,
            getMeta(req)
        );
        if (result.error) throwServiceError(result.error);

        const message = result.data.job_auto_closed
            ? "Application status updated; every vacancy is now filled, so the job was closed"
            : "Application status updated successfully";
        successResponse(res, message, result.data);
    } catch (err) {
        errorResponse(res, 'updateApplicationStatus', err);
    }
};

// ─── Seeker applications ──────────────────────────────────────────────────

const getMyApplications = async (req, res) => {
    try {
        const { page, limit, search, application_status } = req.query;

        // a seeker only ever sees their own applications
        let whereCondition = { deleted: false, seeker_user_code: req.user.code };

        if (application_status) {
            whereCondition.application_status = application_status;
        }
        if (search) {
            whereCondition['$job.title$'] = { [Op.like]: `%${search}%` };
        }

        const applications = await applicationService.getSeekerApplications(whereCondition, page, limit);
        successResponse(res, "Applications fetched successfully", applications);
    } catch (err) {
        errorResponse(res, 'getMyApplications', err);
    }
};

const getMyApplication = async (req, res) => {
    try {
        const application = await applicationService.getSeekerApplication({
            code: req.params.applicationid,
            seeker_user_code: req.user.code,
            deleted: false
        });
        if (!application) {
            throw new CustomError('application_not_found', 404, "Application not found");
        }
        successResponse(res, "Application info fetched", application);
    } catch (err) {
        errorResponse(res, 'getMyApplication', err);
    }
};

const applyToJob = async (req, res) => {
    try {
        // a provider judges an application by these fields, so they must be filled first
        const profile = await profileService.getSeekerProfileByUserCode(req.user.code);
        const missing = profile
            ? SEEKER_FIELDS_REQUIRED_TO_APPLY.filter(field => profile[field] === null || profile[field] === '')
            : SEEKER_FIELDS_REQUIRED_TO_APPLY;
        if (missing.length) {
            throw new CustomError('profile_incomplete', 400, `Complete your profile before applying (missing: ${missing.join(', ')})`);
        }

        const result = await applicationService.applyToJob(
            req.body.job_code,
            { code: req.user.code, job_category_code: profile.job_category_code },
            getMeta(req)
        );
        if (result.error) throwServiceError(result.error);

        successResponse(res, "Application submitted successfully", result.data);
    } catch (err) {
        errorResponse(res, 'applyToJob', err);
    }
};

const withdrawApplication = async (req, res) => {
    try {
        const { applicationid } = req.params;

        const application = await applicationService.getSeekerApplication({
            code: applicationid,
            seeker_user_code: req.user.code,
            deleted: false
        });
        if (!application) {
            throw new CustomError('application_not_found', 404, "Application not found");
        }
        if (application.application_status !== APPLICATION_STATUS.APPLIED) {
            throw new CustomError('application_not_withdrawable', 400, "Only an application that is still 'applied' can be withdrawn");
        }

        const withdrawn = await applicationService.withdrawApplication(applicationid, req.user.code, getMeta(req));
        if (!withdrawn) {
            throw new CustomError('application_not_withdrawable', 400, "Only an application that is still 'applied' can be withdrawn");
        }

        successResponse(res, "Application withdrawn successfully");
    } catch (err) {
        errorResponse(res, 'withdrawApplication', err);
    }
};

module.exports = {
    // Provider applications
    getAllApplications,
    getSingleApplication,
    updateApplicationStatus,
    // Seeker applications
    getMyApplications,
    getMyApplication,
    applyToJob,
    withdrawApplication
};
