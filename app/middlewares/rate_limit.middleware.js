const { rateLimit } = require('express-rate-limit');
const CustomError = require('../lib/custom.error');
const { errorResponse } = require('../lib/response.handler');
const rateLimitService = require('../service/rate_limit.service');
const currentEnv = require('../config/index');

const MINUTE_MS = 60 * 1000;

// express-rate-limit store backed by the rate_limit_hits table, so every app process (pm2
// instances, several servers) counts against the same window
class MysqlStore {
    constructor(name) {
        this.prefix = `${name}:`;
        this.localKeys = false;
    }

    init(options) {
        this.windowMs = options.windowMs;
    }

    get(key) {
        return rateLimitService.getHits(this.prefix + key);
    }

    increment(key) {
        return rateLimitService.hit(this.prefix + key, this.windowMs);
    }

    decrement(key) {
        return rateLimitService.removeHit(this.prefix + key);
    }

    resetKey(key) {
        return rateLimitService.resetHits(this.prefix + key);
    }
}

// Per-IP limits for the public auth and code endpoints
const limiter = (name, windowMinutes, max, message) => rateLimit({
    windowMs: windowMinutes * MINUTE_MS,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: new MysqlStore(name),
    // if the counter table can't be reached the request goes through (logged by the library);
    // login and register can't work without the database anyway
    passOnStoreError: true,
    handler: (req, res) => errorResponse(res, name, new CustomError('too_many_requests', 429, message))
});

const { LOGIN_WINDOW_MINUTES, LOGIN_MAX, REGISTER_WINDOW_MINUTES, REGISTER_MAX, OTP_WINDOW_MINUTES, OTP_MAX } = currentEnv.RATE_LIMIT;

module.exports = {
    loginLimiter: limiter('login', LOGIN_WINDOW_MINUTES, LOGIN_MAX,
        "Too many login attempts from this IP, please try again later"),
    registerLimiter: limiter('register', REGISTER_WINDOW_MINUTES, REGISTER_MAX,
        "Too many registrations from this IP, please try again later"),
    // forgot/reset password and verification codes (each code sent costs an email or SMS)
    otpLimiter: limiter('otp', OTP_WINDOW_MINUTES, OTP_MAX,
        "Too many code requests from this IP, please try again later")
};
