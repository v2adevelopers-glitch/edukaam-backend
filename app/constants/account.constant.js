exports.TOKEN_TTL_SECONDS = 86400;
exports.MAX_FAILED_LOGINS = 5;

exports.OTP_PURPOSE = {
    PASSWORD_RESET: 'password_reset',
    VERIFY_EMAIL: 'verify_email',
    VERIFY_PHONE: 'verify_phone'
};

exports.OTP_CHANNEL = {
    EMAIL: 'email',
    PHONE: 'phone'
};

exports.OTP_LENGTH = 6;
exports.OTP_TTL_MINUTES = 10;
exports.OTP_MAX_ATTEMPTS = 5;
// a new code for the same purpose can't be requested sooner than this
exports.OTP_RESEND_SECONDS = 60;
