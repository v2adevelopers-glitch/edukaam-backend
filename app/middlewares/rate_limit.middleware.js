const { rateLimit } = require('express-rate-limit');
const CustomError = require('../lib/custom.error');
const { errorResponse } = require('../lib/response.handler');
const currentEnv = require('../config/index');

const MINUTE_MS = 60 * 1000;

// Per-IP limits for the public auth endpoints. The in-memory store is per process: with
// several pm2 instances each one counts on its own.
const limiter = (name, windowMinutes, max, message) => rateLimit({
    windowMs: windowMinutes * MINUTE_MS,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => errorResponse(res, name, new CustomError('too_many_requests', 429, message))
});

const { LOGIN_WINDOW_MINUTES, LOGIN_MAX, REGISTER_WINDOW_MINUTES, REGISTER_MAX } = currentEnv.RATE_LIMIT;

module.exports = {
    loginLimiter: limiter('loginLimiter', LOGIN_WINDOW_MINUTES, LOGIN_MAX,
        "Too many login attempts from this IP, please try again later"),
    registerLimiter: limiter('registerLimiter', REGISTER_WINDOW_MINUTES, REGISTER_MAX,
        "Too many registrations from this IP, please try again later")
};
