const CustomError = require('../lib/custom.error');
const { errorResponse } = require('../lib/response.handler');
const profileService = require('../service/profile.service');

// ─── Logos ────────────────────────────────────────────────────────────────

// Institution logos are public (they appear on openings and the public job list)
const getLogo = async (req, res) => {
    try {
        const filePath = await profileService.getLogoFile(req.params.filename);
        if (!filePath) {
            throw new CustomError('logo_not_found', 404, "Logo not found");
        }
        // shown by the frontend from another origin; the name changes whenever the logo does
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cache-Control', 'public, max-age=604800, immutable');
        res.sendFile(filePath, (err) => {
            if (err && !res.headersSent) errorResponse(res, 'getLogo', err);
        });
    } catch (err) {
        errorResponse(res, 'getLogo', err);
    }
};

module.exports = {
    // Logos
    getLogo
};
