const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const healthService = require('../service/health.service');

// ─── Health ───────────────────────────────────────────────────────────────

// For uptime monitors and load balancers: 200 when the API and its database answer, else 503
const getHealth = async (req, res) => {
    try {
        if (!await healthService.isDatabaseUp()) {
            throw new CustomError('database_unavailable', 503, "Database is not reachable");
        }
        successResponse(res, "OK", {
            status: 'ok',
            database: 'up',
            uptime_seconds: Math.round(process.uptime()),
            timestamp: new Date()
        });
    } catch (err) {
        errorResponse(res, 'getHealth', err);
    }
};

module.exports = {
    // Health
    getHealth
};
