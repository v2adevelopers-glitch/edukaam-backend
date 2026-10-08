// Load .env before anything else: requiring routers or cron jobs loads app/model,
// which reads the DB_* variables as soon as it is required
const dotenv = require('dotenv');
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require('./app/config/swagger');
const currentEnv = require('./app/config/index');
const cronScheduler = require('./app/cron');
const db = require('./app/model');

const app = express();

// Behind nginx/a load balancer req.ip (used by the rate limiter) must come from X-Forwarded-For
app.set('trust proxy', currentEnv.TRUST_PROXY);

// gzip responses over 1 KB (lists shrink to about a fifth); file downloads are already compressed
// formats or small, and compression skips them by content type
app.use(compression());
app.use(express.json());
app.use(cors());

app.use('/api-docs', swaggerUi.serveFiles(swaggerSpecs), swaggerUi.setup(swaggerSpecs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'EduJobs Backend Documentation'
}));

// Registered after /api-docs: helmet's default CSP blocks Swagger UI's inline styles
app.use(helmet());

app.get('/', (req, res) => { res.send("[EduJobs Backend] Server Status : UP & Running..."); });

require('./app/router').setup(app);

if (currentEnv.ENABLE_CRON === true) {
    cronScheduler.start();
} else {
    console.log('Cron jobs disabled (set ENABLE_CRON to true in the env config to enable)');
}

const server = app.listen(currentEnv.PORT, () => {
    console.log(`${currentEnv.SERVER_STARTED} On PORT: ${currentEnv.PORT}`);
});

// pm2 restarts send SIGINT/SIGTERM: stop taking connections, let running requests finish, then
// close the DB pool (forced after 10s so a stuck request can't block the restart)
const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    cronScheduler.stop();
    setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
        await db.sequelize.close().catch(() => {});
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
