const CustomError = require('../lib/custom.error');
const { errorResponse } = require('../lib/response.handler');

// Validates req[source] against a Joi schema and replaces it with the cleaned value
// (unknown keys stripped, strings converted to numbers/booleans, defaults applied).
const validate = (source) => (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });

    if (error) {
        return errorResponse(res, `validate_${source}`,
            new CustomError('VALIDATION_ERROR', 400, error.details.map(d => d.message).join('; ')));
    }

    // Express 5 exposes req.query as a getter, so it is redefined rather than assigned
    if (source === 'query') {
        Object.defineProperty(req, 'query', { value, writable: true, configurable: true, enumerable: true });
    } else {
        req[source] = value;
    }
    next();
};

module.exports = {
    validateBody: validate('body'),
    validateParams: validate('params'),
    validateQuery: validate('query'),
};
