const MB = 1024 * 1024;

// What each upload accepts; the type is decided from the file's bytes, not its name or mime type
exports.UPLOADS = {
    RESUME: { dir: 'resumes', maxBytes: 5 * MB, types: ['pdf', 'doc', 'docx'] },
    LOGO: { dir: 'logos', maxBytes: 1 * MB, types: ['png', 'jpg', 'webp'] }
};

// Stored names are <uuid>.<ext>; anything else in a URL is refused
exports.STORED_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx|png|jpg|webp)$/;

exports.LOGO_URL_PREFIX = '/api/v1/public/logos/';
