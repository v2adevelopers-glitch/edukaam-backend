const { Op, fn } = require('sequelize');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const profileService = require('../service/profile.service');
const jobService = require('../service/job.service');
const { visibleOpeningWhere, applyOpeningFilters } = require('../helper/job_filter.helper');

// Public jobs: open and not past their last date (no contact details, no seeker flags)
const publicJobWhere = () => ({ ...visibleOpeningWhere(), last_date: { [Op.gte]: fn('CURDATE') } });

// ─── Public jobs ──────────────────────────────────────────────────────────

const getPublicJobs = async (req, res) => {
    try {
        const { page, limit, job_category_code } = req.query;

        let whereCondition = publicJobWhere();
        if (job_category_code) {
            whereCondition.job_category_code = job_category_code;
        }
        applyOpeningFilters(whereCondition, req.query);

        // same filters = same total; page and limit don't change it
        const { search, job_category_code: category, institution_type_code, job_type, state_code, city_code } = req.query;
        const countKey = 'public_jobs_count:' + JSON.stringify([search, category, institution_type_code, job_type, state_code, city_code]);

        const jobs = await jobService.getPublicJobs(whereCondition, page, limit, countKey);
        successResponse(res, "Jobs fetched successfully", jobs);
    } catch (err) {
        errorResponse(res, 'getPublicJobs', err);
    }
};

const getPublicJob = async (req, res) => {
    try {
        const job = await jobService.getPublicJob({ ...publicJobWhere(), code: req.params.jobid });
        if (!job) {
            throw new CustomError('job_not_found', 404, "Job not found");
        }
        successResponse(res, "Job info fetched", job);
    } catch (err) {
        errorResponse(res, 'getPublicJob', err);
    }
};

// ─── Logos ────────────────────────────────────────────────────────────────

// Institution logos are public (they appear on openings and the public job list)
const getLogo = async (req, res) => {
    try {
        const filePath = await profileService.getLogoFile(req.params.filename);
        if (!filePath) {
            throw new CustomError('logo_not_found', 404, "Logo not found");
        }
        // shown by the frontend from another origin; the name changes whenever the logo does
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cache-Control', 'public, max-age=604800, immutable');
        res.sendFile(filePath, (err) => {
            if (err && !res.headersSent) errorResponse(res, 'getLogo', err);
        });
    } catch (err) {
        errorResponse(res, 'getLogo', err);
    }
};

module.exports = {
    // Public jobs
    getPublicJobs,
    getPublicJob,
    // Logos
    getLogo
};
