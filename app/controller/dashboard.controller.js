const { Op, fn } = require('sequelize');
const { errorResponse, successResponse } = require('../lib/response.handler');
const dashboardService = require('../service/dashboard.service');
const profileService = require('../service/profile.service');
const { JOB_STATUS } = require('../constants/job.constant');

// ─── Dashboards ───────────────────────────────────────────────────────────

const getProviderDashboard = async (req, res) => {
    try {
        const dashboard = await dashboardService.getProviderDashboard(req.user.code);
        successResponse(res, "Provider dashboard fetched", dashboard);
    } catch (err) {
        errorResponse(res, 'getProviderDashboard', err);
    }
};

const getSeekerDashboard = async (req, res) => {
    try {
        const profile = await profileService.getSeekerProfileByUserCode(req.user.code);

        // newest open, unexpired jobs in the seeker's own category (same rows as the openings list)
        const openingsWhere = profile && profile.job_category_code ? {
            deleted: false,
            status: 'active',
            job_status: JOB_STATUS.OPEN,
            job_category_code: profile.job_category_code,
            last_date: { [Op.gte]: fn('CURDATE') }
        } : null;

        const dashboard = await dashboardService.getSeekerDashboard(req.user.code, openingsWhere);
        successResponse(res, "Seeker dashboard fetched", dashboard);
    } catch (err) {
        errorResponse(res, 'getSeekerDashboard', err);
    }
};

module.exports = {
    // Dashboards
    getProviderDashboard,
    getSeekerDashboard
};
