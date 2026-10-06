// First address in x-forwarded-for when behind a proxy, else the socket address
exports.getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || null;
};

// Audit info passed from controllers to services, so services never need req
exports.getMeta = (req) => ({
    userId: req.user ? req.user.id : null,
    ip: exports.getClientIp(req)
});

// Optional text fields accept '' from forms; store it as null. undefined stays undefined,
// so update() still skips fields that were not sent.
exports.emptyToNull = (value) => (value === '' ? null : value);

// True when err is a unique-index violation on one of the given columns (index names
// contain the column: idx_user_email). Lets a race on a duplicate become a 400, not a 500.
exports.isUniqueViolationOn = (err, columns) => {
    if (!err || err.name !== 'SequelizeUniqueConstraintError') return false;
    const keys = Object.keys(err.fields || {});
    return columns.some(column => keys.some(key => key.includes(column)));
};
