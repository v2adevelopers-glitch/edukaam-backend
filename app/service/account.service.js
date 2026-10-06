const db = require('../model');
const userService = require('./user.service');
const otpService = require('./otp.service');
const { sendEmail, sendSms } = require('../helper/messaging.helper');
const { OTP_PURPOSE, OTP_CHANNEL, OTP_TTL_MINUTES } = require('../constants/account.constant');

// Orchestrates account flows that span users, OTPs and outgoing messages. Functions return
// { data } or { error: '<name>' } for the controller to turn into a CustomError.

const deliver = async (channel, destination, subject, text) => {
    if (channel === OTP_CHANNEL.EMAIL) {
        await sendEmail({ to: destination, subject, text });
    } else {
        await sendSms({ to: destination, text });
    }
};

// A wrong code's attempt counter must survive, so OTP errors commit rather than roll back
const consumeOrCommit = async (args, t) => {
    const result = await otpService.consumeOtp(args, t);
    if (result.error) await t.commit();
    return result;
};

// ─── Password ─────────────────────────────────────────────────────────────

exports.changePassword = async (code, newPassword, meta = {}) => {
    try {
        const hash = await userService.hashPassword(newPassword);
        await userService.setPassword(code, hash, meta);
        return { data: await userService.getUserByCode(code) };
    } catch (err) {
        throw err;
    }
};

// Always looks the same to the caller whether or not the account exists, so the endpoint
// can't be used to find out which emails/phones are registered. Delivery problems are logged.
exports.requestPasswordReset = async (username, channel, meta = {}) => {
    try {
        const user = await userService.getUserInfoByUsername(username);
        if (!user || user.status !== 'active') return { data: { sent: false } };
        if (await otpService.getResendWait(user.code, OTP_PURPOSE.PASSWORD_RESET) > 0) return { data: { sent: false } };

        const destination = channel === OTP_CHANNEL.EMAIL ? user.email : user.phone;
        const otp = await otpService.issueOtp({ user_code: user.code, purpose: OTP_PURPOSE.PASSWORD_RESET, channel, destination }, meta);
        try {
            await deliver(channel, destination, "EduJobs password reset code",
                `Your EduJobs password reset code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes. If you did not ask for it, ignore this message.`);
        } catch (sendErr) {
            console.error('[ACCOUNT] password reset code could not be delivered', user.code, sendErr.message);
            return { data: { sent: false } };
        }
        return { data: { sent: true } };
    } catch (err) {
        throw err;
    }
};

// Sets the new password, clears the lockout and ends every session, all in one transaction
exports.resetPassword = async (username, otp, newPassword, meta = {}) => {
    const user = await userService.getUserInfoByUsername(username);
    if (!user || user.status !== 'active') return { error: 'otp_invalid' };
    const hash = await userService.hashPassword(newPassword);

    const t = await db.sequelize.transaction();
    try {
        const result = await consumeOrCommit({ user_code: user.code, purpose: OTP_PURPOSE.PASSWORD_RESET, otp }, t);
        if (result.error) return result;

        await userService.setPassword(user.code, hash, meta, t);
        await t.commit();
        return { data: true };
    } catch (err) {
        if (!t.finished) await t.rollback();
        throw err;
    }
};

// ─── Email / phone verification ───────────────────────────────────────────

const verifyPurpose = (channel) => (channel === OTP_CHANNEL.EMAIL ? OTP_PURPOSE.VERIFY_EMAIL : OTP_PURPOSE.VERIFY_PHONE);

exports.sendVerification = async (user, channel, meta = {}) => {
    try {
        const verified = channel === OTP_CHANNEL.EMAIL ? user.email_verified_at : user.phone_verified_at;
        if (verified) return { error: 'already_verified' };

        const purpose = verifyPurpose(channel);
        const wait = await otpService.getResendWait(user.code, purpose);
        if (wait > 0) return { error: 'otp_cooldown', wait };

        const destination = channel === OTP_CHANNEL.EMAIL ? user.email : user.phone;
        const otp = await otpService.issueOtp({ user_code: user.code, purpose, channel, destination }, meta);
        try {
            await deliver(channel, destination, "Verify your EduJobs email",
                `Your EduJobs verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`);
        } catch (sendErr) {
            console.error('[ACCOUNT] verification code could not be delivered', user.code, sendErr.message);
            return { error: 'otp_delivery_failed' };
        }
        return { data: { destination } };
    } catch (err) {
        throw err;
    }
};

exports.confirmVerification = async (user, channel, otp, meta = {}) => {
    const t = await db.sequelize.transaction();
    try {
        const result = await consumeOrCommit({ user_code: user.code, purpose: verifyPurpose(channel), otp }, t);
        if (result.error) return result;

        // the code proves ownership of the address it was sent to, not of one changed since
        const current = channel === OTP_CHANNEL.EMAIL ? user.email : user.phone;
        if (result.data.destination !== current) {
            await t.rollback();
            return { error: 'otp_invalid' };
        }

        await userService.markVerified(user.code, channel, meta, t);
        await t.commit();
        return { data: await userService.getUserByCode(user.code) };
    } catch (err) {
        if (!t.finished) await t.rollback();
        throw err;
    }
};

// ─── Sessions ─────────────────────────────────────────────────────────────

exports.logout = async (code, meta = {}) => {
    try {
        return { data: await userService.revokeSessions(code, meta) };
    } catch (err) {
        throw err;
    }
};
