const { Op, fn } = require('sequelize');
const { errorResponse, successResponse } = require('../lib/response.handler');
const dashboardService = require('../service/dashboard.service');
const profileService = require('../service/profile.service');
const { visibleOpeningWhere } = require('../helper/job_filter.helper');

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
        const categoryCodes = await profileService.getSeekerCategoryCodes(req.user.code);

        // newest open, unexpired jobs in the seeker's categories (same rows as the openings list)
        const openingsWhere = categoryCodes.length ? {
            ...visibleOpeningWhere(),
            job_category_code: { [Op.in]: categoryCodes },
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
