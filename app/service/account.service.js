const db = require('../model');
const userService = require('./user.service');
const otpService = require('./otp.service');
const profileService = require('./profile.service');
const jobService = require('./job.service');
const applicationService = require('./application.service');
const { ROLE_CODES } = require('../constants/role.constant');
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

// ─── Delete / export my account ───────────────────────────────────────────

// All in one transaction: a seeker's open applications are withdrawn (hires stay) and saved
// jobs dropped; a provider's open jobs are closed; the profile's personal data is cleared and
// the user anonymised. Stored files are removed after the commit.
exports.deleteAccount = async (user, meta = {}) => {
    const t = await db.sequelize.transaction();
    let file = null;
    try {
        if (user.role_code === ROLE_CODES.JOB_SEEKER) {
            await applicationService.withdrawAllForSeeker(user.code, meta, t);
            await jobService.unsaveAllForSeeker(user.code, meta, t);
            file = { kind: 'RESUME', name: await profileService.eraseSeekerProfile(user.code, meta, t) };
        } else if (user.role_code === ROLE_CODES.JOB_PROVIDER) {
            await jobService.closeAllForProvider(user.code, meta, t);
            file = { kind: 'LOGO', name: await profileService.eraseProviderProfile(user.code, meta, t) };
        }
        await otpService.retireAll(user.code, t);
        await userService.anonymizeUser(user.code, meta, t);
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }

    if (file && file.name) {
        try {
            await profileService.removeStoredFile(file.kind, file.name);
        } catch (err) {
            console.error('[ACCOUNT] stored file of a deleted account could not be removed', user.code, err.message);
        }
    }
    return { data: true };
};

const EXPORT_LIMIT = 10000;

// Everything the platform holds about the user, as one JSON document
exports.exportAccount = async (user) => {
    try {
        const data = {
            exported_at: new Date(),
            account: userService.formatUserInfo(user),
            role_info: userService.formatRoleInfo(user),
            profile: await profileService.getProfileForRole(user.role_code, user.code)
        };

        if (user.role_code === ROLE_CODES.JOB_SEEKER) {
            const [applications, saved] = await Promise.all([
                applicationService.getSeekerApplications({ deleted: false, seeker_user_code: user.code }, 1, EXPORT_LIMIT),
                jobService.getSavedJobs({ deleted: false }, user.code, 1, EXPORT_LIMIT)
            ]);
            data.applications = applications.data;
            data.saved_jobs = saved.data.map(j => ({ code: j.code, title: j.title, institution_name: j.institution_name, saved_at: j.saved_at }));
        } else if (user.role_code === ROLE_CODES.JOB_PROVIDER) {
            const jobs = await jobService.getProviderJobs({ deleted: false, provider_user_code: user.code }, 1, EXPORT_LIMIT);
            data.jobs = jobs.data;
        }
        return { data };
    } catch (err) {
        throw err;
    }
};
