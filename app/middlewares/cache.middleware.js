// Lets browsers and any CDN in front reuse a public, user-independent response for a while.
// Only for routes that answer the same to everyone (no token).
exports.cachePublic = (seconds) => (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${seconds}`);
    next();
};
