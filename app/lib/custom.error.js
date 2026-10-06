class CustomError extends Error {
    constructor(name, httpCode, message) {
        super(message);
        this.name = name;
        this.httpCode = httpCode;
        this.message = message;
    }
}

module.exports = CustomError;
