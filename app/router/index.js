exports.setup = (app) => {
    try {
        app.use('/api/v1/users', require('./user.router'));
        app.use('/api/v1/rbac', require('./rbac.router'));
        app.use('/api/v1/master', require('./master.router'));

        console.log("Routing Setup Completed [✓]");
    } catch (err) {
        console.log("Routing Setup Failed [X]", err);
    }
};
