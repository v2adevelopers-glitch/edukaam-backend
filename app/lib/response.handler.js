// handlerName is the controller function name: it becomes the message of 500s, so logs and
// clients can tell which handler failed without seeing the internal error
exports.errorResponse = (res, handlerName, error) => {
    const statusCode = error && error.httpCode ? error.httpCode : 500;
    // 4xx are expected (bad input, auth, rate limits): one line; only real failures get the stack
    if (statusCode >= 500) {
        console.log("=========Error==========", handlerName, statusCode, error);
    } else {
        console.log(`[${statusCode}] ${handlerName}: ${error && error.name} ${error && error.message}`);
    }

    const message = statusCode === 500
        ? `${handlerName} [Internal Server Error]`
        : (error && error.message) || handlerName;

    res.status(statusCode).json({
        statusCode,
        success: false,
        message,
        // 500s may carry SQL or stack details, so only the error name of a CustomError is sent
        resData: statusCode === 500 ? null : { error: error.name }
    });
};

// Sends a stored file as a download; errors before any byte is sent still use the envelope
exports.fileResponse = (res, handlerName, filePath, downloadName) => {
    res.download(filePath, downloadName, (err) => {
        if (err && !res.headersSent) exports.errorResponse(res, handlerName, err);
    });
};

// statusCode is 200 except where a route documents otherwise (201 for registration)
exports.successResponse = (res, message, resData, statusCode = 200) => {
    res.status(statusCode).json({
        statusCode,
        success: true,
        message,
        resData
    });
};
