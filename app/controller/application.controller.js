const { Op } = require('sequelize');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse, fileResponse } = require('../lib/response.handler');
const applicationService = require('../service/application.service');
const profileService = require('../service/profile.service');
const { getMeta } = require('../helper/common.helper');
const { toCsv } = require('../helper/csv.helper');
const { APPLICATION_STATUS, SEEKER_FIELDS_REQUIRED_TO_APPLY, APPLICATION_EXPORT_MAX_ROWS } = require('../constants/job.constant');

// Rules the application service checks inside its transaction, reported as { error: name }
const SERVICE_ERRORS = {
    application_not_found: [404, "Application not found"],
    application_status_unchanged: [400, "The application already has this status"],
    job_vacancies_filled: [400, "Every vacancy for this job is already filled"],
    job_not_open: [400, "This job is not open for applications"],
    job_expired: [400, "The last date to apply for this job has passed"],
    category_mismatch: [400, "This job is not in any of your job categories"],
    already_applied: [400, "You have already applied for this job"]
};

const throwServiceError = (name) => {
    const [httpCode, message] = SERVICE_ERRORS[name] || [400, name];
    throw new CustomError(name, httpCode, message);
};

// interview fields from a validated status body (Joi strips them unless the status is 'interview')
const interviewFrom = (body) => (body.application_status === APPLICATION_STATUS.INTERVIEW ? {
    interview_at: body.interview_at,
    interview_mode: body.interview_mode,
    interview_location: body.interview_location,
    interview_notes: body.interview_notes
} : null);

// ─── Provider applications ────────────────────────────────────────────────

// List and export share the filters
const providerApplicationsWhere = (query, providerCode) => {
    const { search, job_code, application_status, job_category_code } = query;

    // only applications on the provider's own jobs
    let whereCondition = { deleted: false, '$job.provider_user_code$': providerCode, '$job.deleted$': false };

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
    return whereCondition;
};

const getAllApplications = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const whereCondition = providerApplicationsWhere(req.query, req.user.code);

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
        application.applicant.additional_job_categories = await profileService.getSeekerAdditionalCategories(application.applicant.code);
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
            getMeta(req),
            interviewFrom(req.body)
        );
        if (result.error) throwServiceError(result.error);

        let message = "Application status updated successfully";
        if (result.data.job_auto_closed) message = "Application status updated; every vacancy is now filled, so the job was closed";
        if (result.data.rescheduled) message = "Interview details updated";
        successResponse(res, message, result.data);
    } catch (err) {
        errorResponse(res, 'updateApplicationStatus', err);
    }
};

// One status for many applications. Each one goes through the same transaction as a single
// change, in order, so hiring stops at the vacancy limit; failures don't stop the rest.
const bulkUpdateApplicationStatus = async (req, res) => {
    try {
        const { application_codes, application_status } = req.body;
        const interview = interviewFrom(req.body);
        const meta = getMeta(req);

        const results = [];
        for (const code of application_codes) {
            const result = await applicationService.updateApplicationStatus(code, req.user.code, application_status, meta, interview);
            if (result.error) {
                const [, message] = SERVICE_ERRORS[result.error] || [400, result.error];
                results.push({ code, success: false, error: result.error, message });
            } else {
                results.push({ code, success: true, job_code: result.data.job_code, job_auto_closed: result.data.job_auto_closed });
            }
        }

        const updated = results.filter(r => r.success).length;
        successResponse(res, `${updated} of ${results.length} applications updated`, {
            updated,
            failed: results.length - updated,
            results
        });
    } catch (err) {
        errorResponse(res, 'bulkUpdateApplicationStatus', err);
    }
};

const updateProviderNotes = async (req, res) => {
    try {
        const result = await applicationService.updateProviderNotes(req.params.applicationid, req.user.code, req.body.provider_notes, getMeta(req));
        if (!result) {
            throw new CustomError('application_not_found', 404, "Application not found");
        }
        successResponse(res, "Notes saved", result);
    } catch (err) {
        errorResponse(res, 'updateProviderNotes', err);
    }
};

const EXPORT_COLUMNS = [
    { key: 'code', header: 'Application code' },
    { key: 'applied_at', header: 'Applied at' },
    { key: 'application_status', header: 'Status' },
    { key: 'job_code', header: 'Job code' },
    { key: 'job_title', header: 'Job title' },
    { key: 'job_category_name', header: 'Category' },
    { key: 'applicant_code', header: 'Applicant code' },
    { key: 'applicant_name', header: 'Applicant name' },
    { key: 'applicant_phone', header: 'Phone' },
    { key: 'applicant_email', header: 'Email' },
    { key: 'qualification', header: 'Qualification' },
    { key: 'experience_years', header: 'Experience (years)' },
    { key: 'interview_at', header: 'Interview at' },
    { key: 'interview_mode', header: 'Interview mode' }
];

// CSV of the provider's applicants, with the list's filters (no pagination, capped)
const exportApplications = async (req, res) => {
    try {
        const whereCondition = providerApplicationsWhere(req.query, req.user.code);
        const rows = await applicationService.getProviderApplicationsForExport(whereCondition, APPLICATION_EXPORT_MAX_ROWS);

        const day = new Date().toISOString().slice(0, 10);
        res.set('Content-Type', 'text/csv; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="applications-${day}.csv"`);
        res.status(200).send(toCsv(EXPORT_COLUMNS, rows));
    } catch (err) {
        errorResponse(res, 'exportApplications', err);
    }
};

// Only the provider who owns the job can download the applicant's resume
const downloadApplicantResume = async (req, res) => {
    try {
        const application = await applicationService.getProviderApplication({
            code: req.params.applicationid,
            deleted: false,
            '$job.provider_user_code$': req.user.code
        });
        if (!application) {
            throw new CustomError('application_not_found', 404, "Application not found");
        }

        const file = await profileService.getSeekerResumeFile(application.applicant.code);
        if (!file) {
            throw new CustomError('resume_not_found', 404, "The applicant has not uploaded a resume");
        }
        fileResponse(res, 'downloadApplicantResume', file.path, file.name);
    } catch (err) {
        errorResponse(res, 'downloadApplicantResume', err);
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

        const categoryCodes = await profileService.getSeekerCategoryCodes(req.user.code);
        const result = await applicationService.applyToJob(
            req.body.job_code,
            { code: req.user.code, job_category_codes: categoryCodes },
            getMeta(req),
            req.body.cover_note
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
    bulkUpdateApplicationStatus,
    updateProviderNotes,
    exportApplications,
    downloadApplicantResume,
    // Seeker applications
    getMyApplications,
    getMyApplication,
    applyToJob,
    withdrawApplication
};
