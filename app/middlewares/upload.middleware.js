const multer = require('multer');
const CustomError = require('../lib/custom.error');
const { errorResponse } = require('../lib/response.handler');
const { detectFileType } = require('../helper/file_storage.helper');

// One multipart file in the field "file", kept in memory (uploads are small) and checked by
// content before the controller sees it. upload = an entry of UPLOADS in file.constant.js.
const uploadSingle = (upload) => {
    const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: upload.maxBytes, files: 1 } }).single('file');

    return (req, res, next) => {
        parser(req, res, (err) => {
            if (err) {
                const error = err.code === 'LIMIT_FILE_SIZE'
                    ? new CustomError('file_too_large', 400, `The file must be at most ${Math.round(upload.maxBytes / 1024 / 1024)} MB`)
                    : new CustomError('invalid_upload', 400, "Send one file in the multipart field \"file\"");
                return errorResponse(res, 'uploadSingle', error);
            }
            if (!req.file) {
                return errorResponse(res, 'uploadSingle', new CustomError('file_missing', 400, "Send one file in the multipart field \"file\""));
            }

            const type = detectFileType(req.file.buffer);
            if (!type || !upload.types.includes(type)) {
                return errorResponse(res, 'uploadSingle',
                    new CustomError('invalid_file_type', 400, `Allowed file types: ${upload.types.join(', ')}`));
            }
            req.file.detectedType = type;
            next();
        });
    };
};

module.exports = { uploadSingle };
