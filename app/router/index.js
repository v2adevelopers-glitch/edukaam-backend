exports.setup = (app) => {
    try {
        app.use('/api/v1/users', require('./user.router'));
        app.use('/api/v1/rbac', require('./rbac.router'));
        app.use('/api/v1/master', require('./master.router'));
        app.use('/api/v1/profile', require('./profile.router'));
        app.use('/api/v1/job', require('./job.router'));
        app.use('/api/v1/application', require('./application.router'));
        app.use('/api/v1/dashboard', require('./dashboard.router'));
        app.use('/api/v1/public', require('./public.router'));

        console.log("Routing Setup Completed [✓]");
    } catch (err) {
        console.log("Routing Setup Failed [X]", err);
    }
};
