// roles.code values; new roles take max(code) + 1
exports.ROLE_CODES = {
    ADMIN: 1001,
    JOB_PROVIDER: 1002,
    JOB_SEEKER: 1003
};

// Keys the frontend uses for each role
exports.ROLE_KEYS = {
    [exports.ROLE_CODES.ADMIN]: 'admin',
    [exports.ROLE_CODES.JOB_PROVIDER]: 'job_provider',
    [exports.ROLE_CODES.JOB_SEEKER]: 'job_seeker'
};

// Roles a visitor may pick on the public register form (never admin)
exports.REGISTRABLE_ROLE_KEYS = ['job_provider', 'job_seeker'];

exports.getRoleKey = (roleCode) => exports.ROLE_KEYS[roleCode] || null;

exports.getRoleCodeByKey = (roleKey) => {
    const entry = Object.entries(exports.ROLE_KEYS).find(([, key]) => key === roleKey);
    return entry ? Number(entry[0]) : null;
};
