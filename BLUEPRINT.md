# Backend Blueprint — Node + Express 5 + Sequelize/MySQL

This file describes the architecture, folder layout, code style and database rules of `supplier_booking_backend`. It also has copy-ready code for every foundation file. Use it to start a new backend that is structured and written the same way.

**How to use it**

- **By hand:** follow [§12 New project checklist](#12-new-project-checklist). Copy the files in §4–§6, replace the placeholders, then add your own modules with the recipe in §7.
- **With Claude Code:** put this file at the root of the new, empty repo and ask: *"Scaffold this project from BLUEPRINT.md. Project name X, code prefix Y, first modules: …"*. For later work, ask: *"Add a module for <entity> following BLUEPRINT.md"*.

**Placeholders** (replace everywhere):

| Placeholder | Meaning | Example (source project) |
|---|---|---|
| `{{PROJECT_NAME}}` | npm / repo name | `supplier_booking_backend` |
| `{{PROJECT_TITLE}}` | Human title (Swagger, health check) | `Supplier Panel Backend` |
| `{{CODE_PREFIX}}` | Business-code prefix | `V2A` → `V2AUSR00001` |
| `{{PM2_NAME}}` | pm2 process name | `supplier_api` |
| `{{PROD_API_URL}}` | Production base URL | `https://api-supplier.example.com` |
| `{{AUTHOR}}` | package.json / Swagger contact | `Tej Pratap` |

---

## Contents

1. [Stack](#1-stack)
2. [Folder structure](#2-folder-structure)
3. [Architecture and request flow](#3-architecture-and-request-flow)
4. [Foundation files (copy as-is)](#4-foundation-files-copy-as-is)
5. [Core models: users, roles, RBAC](#5-core-models-users-roles-rbac)
6. [Core module: auth + RBAC check](#6-core-module-auth--rbac-check)
7. [Module recipe (copy per entity)](#7-module-recipe-copy-per-entity)
8. [Conventions reference](#8-conventions-reference)
9. [Database rules](#9-database-rules)
10. [Swagger, Postman, README](#10-swagger-postman-readme)
11. [Pitfalls](#11-pitfalls)
12. [New project checklist](#12-new-project-checklist)
13. [Differences from the source project](#13-differences-from-the-source-project)

---

## 1. Stack

| Concern | Choice |
|---|---|
| Runtime | Node 22, CommonJS (`require` / `module.exports`) |
| HTTP | Express 5 (async errors are handled per handler with `try/catch`) |
| ORM / DB | Sequelize 6 + `mysql2` (MySQL) |
| Migrations / seeders | `sequelize-cli` (configured by `.sequelizerc`) |
| Validation | Joi 18, applied by middleware (`validateBody/Params/Query`) |
| Auth | JWT in the `x-access-token` header, `bcrypt` password hashes |
| Permissions | Table-driven RBAC (roles → modules → API endpoint mapping) |
| Docs | `swagger-jsdoc` + `swagger-ui-express`, docs live in `app/docs/*.swagger.js` |
| Jobs | `node-cron`, started by `app.js` when `ENABLE_CRON` is true |
| Deploy | GitHub Actions on a self-hosted runner → pm2 |

### `package.json`

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "db:migrate": "sequelize-cli db:migrate",
    "db:migrate:status": "sequelize-cli db:migrate:status",
    "db:seed:all": "sequelize-cli db:seed:all"
  },
  "author": "{{AUTHOR}}",
  "license": "ISC",
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "joi": "^18.0.0",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.14.1",
    "node-cron": "^4.6.0",
    "sequelize": "^6.37.7",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.10",
    "sequelize-cli": "^6.6.3"
  }
}
```

Add these only when a feature needs them: `multer` (uploads), `nodemailer` (email), `axios` (third-party calls), `ulid` (opaque public references), `csv-parse` / `xlsx` (bulk import), `helmet` / `express-rate-limit` (hardening).

---

## 2. Folder structure

```
.
├── app.js                          express app: middleware, swagger UI, router.setup(app), cron start, listen
├── .env / .env.example             DB + JWT secrets (never committed)
├── .sequelizerc                    points sequelize-cli at app/config, app/migrations, app/seeders
├── BLUEPRINT.md                    this file
├── README.md                       setup, API areas table, conventions summary, known issues
├── <name>.postman_collection.json  one request per mounted route, one folder per area
├── .github/workflows/deploy.yml    push to main → self-hosted runner → pm2 restart
└── app/
    ├── config/
    │   ├── config.js               sequelize-cli DB config (reads .env)
    │   ├── index.js                picks dev/uat/prod.json by NODE_ENV
    │   ├── dev.json  uat.json  prod.json   PORT, ENABLE_CRON, FRONTEND_BASE_URL, ...
    │   └── swagger.js              builds the OpenAPI spec from app/docs/*.swagger.js
    ├── constants/                  role codes, business constants, string constants
    ├── controller/<area>.controller.js   HTTP layer
    ├── service/<area>.service.js         DB access + business logic
    ├── router/
    │   ├── index.js                mounts every area router at /api/v1/<area>
    │   └── <area>.router.js        routes + middleware chain only
    ├── model/
    │   ├── index.js                Sequelize instance, registers models on `db`, associations, sync
    │   └── <folder>/<name>.model.js     one model per file
    ├── middlewares/
    │   ├── auth.middleware.js      protect, restrictTo, checkApiModuleAccess
    │   └── validation.middleware.js     validateBody / validateParams / validateQuery
    ├── lib/
    │   ├── custom.error.js         CustomError(name, httpCode, message)
    │   └── response.handler.js     successResponse / errorResponse (the envelope)
    ├── helper/                     getClientIp, code generators, query (date) helpers, encryption
    ├── utils/
    │   └── validation.schemas.js   every Joi schema, grouped per area
    ├── docs/<area>.swagger.js      swagger-jsdoc blocks only (no code)
    ├── cron/
    │   ├── index.js                CronScheduler singleton (register/start/stop/runJob)
    │   ├── jobRunner.js            overlap guard + timing + error logging
    │   ├── schedules.js            named cron expressions
    │   └── jobs/<jobName>.js       one async function per job
    ├── data/*.json                 large master data used by seeders
    ├── migrations/                 sequelize-cli migrations (schema changes to existing tables)
    └── seeders/                    sequelize-cli seeders (master data, default users)
```

**File naming:** `<area>.<layer>.js` in lowercase (`location.controller.js`, `location.service.js`, `location.router.js`, `location.swagger.js`). Multi-word areas use snake_case (`api_log.service.js`). Models are `<entity>.model.js` inside a folder per domain (`model/inventory/inventory_pnr.model.js`).

---

## 3. Architecture and request flow

```
HTTP request
  → router            (app/router/<area>.router.js)
  → protect           JWT → req.user                      (skip only for genuinely public routes)
  → restrictTo(...)   fixed-role gate                     (optional)
  → checkApiModuleAccess   RBAC by route pattern + method (write routes)
  → validateParams → validateQuery → validateBody   (Joi; replaces req.* with the cleaned value)
  → controller        reads req, builds filters, existence/duplicate checks, throws CustomError
  → service           every DB query, transactions, business rules; never sees req/res
  → model (db.*)      Sequelize models registered in app/model/index.js
  → successResponse / errorResponse   one JSON envelope for every response
```

**Layer responsibilities — hard rules**

| Layer | Does | Never does |
|---|---|---|
| Router | Declares paths, chains middleware, points to a controller handler | Logic, DB, parsing |
| Middleware | Auth, permission, Joi validation | Business logic |
| Controller | Reads `req`, builds `whereCondition` for lists, calls small service checks (`xExists`, `getUsageCounts`), throws `CustomError` for 4xx, calls the write, sends the response | `require('../model')`, `db.*`, transactions |
| Service | All DB access, transactions, row locks, business rules; returns data or `null`/`false` | Receives `req`/`res`; sends responses |
| Model | Columns, indexes, `toJSON` tweaks | Foreign keys (`references:`); those go in associations in `model/index.js` |

**Response envelope** (every endpoint):

```json
{ "statusCode": 200, "success": true, "message": "Categories fetched successfully", "resData": { } }
```

List endpoints always return `resData: { data: [...], pagination: { total, page, limit, totalPages } }` and nothing else.

---

## 4. Foundation files (copy as-is)

### `.env.example`

```ini
NODE_ENV=development
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=3306
JWT_SECRET_KEY=
# used only by the default-users seeder
SEED_ADMIN_PASSWORD=
```

### `.gitignore`

```
node_modules
.env
.idea
.vscode
uploads
```

### `.sequelizerc`

```js
const path = require('path');

module.exports = {
  'config': path.resolve('app/config', 'config.js'),
  'models-path': path.resolve('app/model'),
  'seeders-path': path.resolve('app/seeders'),
  'migrations-path': path.resolve('app/migrations')
};
```

### `app/config/config.js` (sequelize-cli)

```js
require('dotenv').config();

const db = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql"
};

module.exports = {
    development: db,
    test: db,
    production: db
};
```

### `app/config/index.js` + `dev.json`

```js
const configs = {
    development: './dev.json',
    testing: './uat.json',
    production: './prod.json'
};

module.exports = require(configs[process.env.NODE_ENV] || configs.development);
```

```json
{
    "PORT": 8080,
    "SERVER_STARTED": "Development Server Started",
    "COMP_NAME": "{{PROJECT_TITLE}}",
    "ENABLE_CRON": false,
    "FRONTEND_BASE_URL": "http://localhost:3000"
}
```

`uat.json` and `prod.json` have the same keys.

### `app.js`

```js
// Load .env before anything else: requiring routers or cron jobs loads app/model,
// which reads the DB_* variables as soon as it is required
const dotenv = require('dotenv');
dotenv.config();

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require('./app/config/swagger');
const currentEnv = require('./app/config/index');
const cronScheduler = require('./app/cron');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api-docs', swaggerUi.serveFiles(swaggerSpecs), swaggerUi.setup(swaggerSpecs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: '{{PROJECT_TITLE}} Documentation'
}));

app.get('/', (req, res) => { res.send("[{{PROJECT_TITLE}}] Server Status : UP & Running..."); });

require('./app/router').setup(app);

if (currentEnv.ENABLE_CRON === true) {
    cronScheduler.start();
} else {
    console.log('Cron jobs disabled (set ENABLE_CRON to true in the env config to enable)');
}

app.listen(currentEnv.PORT, () => {
    console.log(`${currentEnv.SERVER_STARTED} On PORT: ${currentEnv.PORT}`);
});
```

### `app/lib/custom.error.js`

```js
class CustomError extends Error {
    constructor(name, httpCode, message) {
        super(message);
        this.name = name;
        this.httpCode = httpCode;
        this.message = message;
    }
}

module.exports = CustomError;
```

### `app/lib/response.handler.js`

```js
// handlerName is the controller function name: it becomes the message of 500s, so logs and
// clients can tell which handler failed without seeing the internal error
exports.errorResponse = (res, handlerName, error) => {
    const statusCode = error && error.httpCode ? error.httpCode : 500;
    console.log("=========Error==========", handlerName, statusCode, error);

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

exports.successResponse = (res, message, resData) => {
    res.status(200).json({
        statusCode: 200,
        success: true,
        message,
        resData
    });
};
```

### `app/middlewares/validation.middleware.js`

```js
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
```

### `app/utils/validation.schemas.js` (header)

```js
const Joi = require('joi');

// Common validation patterns
const commonPatterns = {
    id: Joi.number().integer().positive().required(),
    code: Joi.string().trim().required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().trim().pattern(/^[0-9]{10,15}$/),
    status: Joi.string().valid('active', 'inactive'),
    date: Joi.date().iso()
};

// ─── Users / auth ─────────────────────────────────────────────────────────

exports.userSchemas = {
    login: Joi.object({
        username: Joi.string().trim().required(),   // email or phone
        password: Joi.string().required()
    })
};

// ─── <Area> ───────────────────────────────────────────────────────────────
// exports.<area>Schemas = { get<Entities>, <entity>id, create<Entity>, update<Entity> };
```

### `app/router/index.js`

```js
exports.setup = (app) => {
    try {
        app.use('/api/v1/users', require('./user.router'));
        app.use('/api/v1/rbac', require('./rbac.router'));
        // app.use('/api/v1/<area>', require('./<area>.router'));

        console.log("Routing Setup Completed [✓]");
    } catch (err) {
        console.log("Routing Setup Failed [X]", err);
    }
};
```

### `app/helper/common.helper.js`

```js
// First address in x-forwarded-for when behind a proxy, else the socket address
exports.getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.ip || req.socket?.remoteAddress || null;
};

// Audit info passed from controllers to services, so services never need req
exports.getMeta = (req) => ({
    userId: req.user ? req.user.id : null,
    ip: exports.getClientIp(req)
});
```

### `app/helper/query.helper.js`

```js
const { Op } = require('sequelize');

// created_at between from and to (whole days, either end optional); null when neither is given
const dateRangeWhere = (from, to) => {
    if (from && to) return { [Op.between]: [new Date(from), new Date(`${to}T23:59:59`)] };
    if (from) return { [Op.gte]: new Date(from) };
    if (to) return { [Op.lte]: new Date(`${to}T23:59:59`) };
    return null;
};

// Joi turns dates into Date objects (UTC midnight); DATEONLY columns get 'YYYY-MM-DD' so the
// server timezone can't shift them a day
const toDateOnly = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : (value || null));

// Conditions for a row whose fromField..toField window (either end may be null = open) covers day
const coversDay = (day, fromField = 'effective_from', toField = 'effective_to') => ([
    { [Op.or]: [{ [fromField]: null }, { [fromField]: { [Op.lte]: day } }] },
    { [Op.or]: [{ [toField]: null }, { [toField]: { [Op.gte]: day } }] }
]);

module.exports = { dateRangeWhere, toDateOnly, coversDay };
```

### `app/helper/code_generator.helper.js`

Business codes (`{{CODE_PREFIX}}USR00001`) are what the API exposes and what other tables reference. Database ids stay internal.

```js
const db = require('../model');

const COMP_PREFIX = "{{CODE_PREFIX}}";

const PREFIX = {
    USER: `${COMP_PREFIX}USR`,
    // CATEGORY: `${COMP_PREFIX}CAT`,
};

const nextSeq = (lastCode, prefix) => {
    if (!lastCode) return 1;
    const numeric = parseInt(lastCode.replace(prefix, ''), 10);
    return isNaN(numeric) ? 1 : numeric + 1;
};

// Looks at every row, deleted ones included: codes are unique across all rows.
// Call it inside the same transaction as the insert when two creates can race.
const nextCode = async (model, column, prefix, width = 5, transaction = null) => {
    const last = await model.findOne({ order: [['id', 'DESC']], attributes: [column], transaction });
    return prefix + String(nextSeq(last && last[column], prefix)).padStart(width, '0');
};

exports.generateUserCode = (transaction = null) => nextCode(db.user, 'code', PREFIX.USER, 5, transaction);
```

### `app/constants/role.constant.js`

```js
// roles.code values; new roles take max(code) + 1
exports.ROLE_CODES = {
    ADMIN: 1001
};
```

### `app/config/swagger.js`

```js
const path = require('path');
const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');

const DOCS_DIR = path.join(__dirname, '../docs');
const docFiles = fs.readdirSync(DOCS_DIR)
    .filter(file => file.endsWith('.swagger.js'))
    .map(file => path.join(DOCS_DIR, file));

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '{{PROJECT_TITLE}} API',
            version: '1.0.0',
            contact: { name: '{{AUTHOR}}' }
        },
        servers: [
            { url: 'http://localhost:8080', description: 'Development server' },
            { url: '{{PROD_API_URL}}', description: 'Production server' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-access-token',
                    description: 'JWT from POST /api/v1/users/login'
                }
            },
            schemas: {
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'integer', example: 200 },
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                        resData: { type: 'object', description: 'Response payload' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'integer', example: 400 },
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        resData: {
                            type: 'object',
                            nullable: true,
                            properties: { error: { type: 'string', example: 'category_not_found' } }
                        }
                    }
                },
                PaginationResponse: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer', example: 42 },
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        totalPages: { type: 'integer', example: 5 }
                    }
                }
            }
        }
    },
    apis: docFiles
};

module.exports = swaggerJsdoc(options);
```

**Second Swagger page (optional).** To document a partner/service API separately, exclude its doc file from `docFiles`, build a second spec from it, and copy in any shared schemas its `$ref`s use. Then mount it in `app.js` with its own `swaggerUi.serveFiles(spec)`. Plain `swaggerUi.serve` makes both pages show the same spec.

### `app/model/index.js`

```js
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    logging: false, // set to console.log to see the SQL
    dialectOptions: { connectTimeout: 60000 }
});

sequelize.authenticate()
    .then(() => console.log("Database Connection Success [✓]"))
    .catch((err) => console.log("Error Connecting Database [X]", err));

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ─── Models ───────────────────────────────────────────────────────────────
db.role = require('./role/role.model')(sequelize, DataTypes);
db.user = require('./user/user.model')(sequelize, DataTypes);
db.module = require('./modules/module.model')(sequelize, DataTypes);
db.menu = require('./menu/menu.model')(sequelize, DataTypes);
db.roleModuleAccessMapping = require('./modules/role_module_access_mapping.model')(sequelize, DataTypes);
db.apiModuleMapping = require('./modules/api_module_mapping.model')(sequelize, DataTypes);

// ─── Associations ─────────────────────────────────────────────────────────
// Foreign keys are created here only (never `references:` in a model). Always give `as`,
// onDelete and onUpdate, and use the same values on both sides of a pair.

// User -> Role by code (a role can't be deleted while users have it)
db.user.belongsTo(db.role, { foreignKey: 'role_code', targetKey: 'code', as: 'role', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.role.hasMany(db.user, { foreignKey: 'role_code', sourceKey: 'code', as: 'users', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });

// Role-module access rows belong to their role and module
db.roleModuleAccessMapping.belongsTo(db.role, { foreignKey: 'role_code', targetKey: 'code', as: 'role', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.role.hasMany(db.roleModuleAccessMapping, { foreignKey: 'role_code', sourceKey: 'code', as: 'moduleAccess', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.roleModuleAccessMapping.belongsTo(db.module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.module.hasMany(db.roleModuleAccessMapping, { foreignKey: 'module_id', as: 'roleAccess', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// API endpoint -> module
db.apiModuleMapping.belongsTo(db.module, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.module.hasMany(db.apiModuleMapping, { foreignKey: 'module_id', as: 'apis', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// Menu -> module, and the menu tree
db.menu.belongsTo(db.module, { foreignKey: 'module_id', as: 'module', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
db.module.hasMany(db.menu, { foreignKey: 'module_id', as: 'menus', onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
db.menu.belongsTo(db.menu, { foreignKey: 'parent_id', as: 'parent', onDelete: 'SET NULL', onUpdate: 'NO ACTION' });
db.menu.hasMany(db.menu, { foreignKey: 'parent_id', as: 'children', onDelete: 'SET NULL', onUpdate: 'NO ACTION' });

// Creates missing tables only; it never changes existing ones (use migrations for that).
// NEVER use force: true: it drops and recreates every table in every process that loads this file.
db.sequelize.sync({ force: false });

module.exports = db;
```

### Cron: `app/cron/`

`schedules.js`

```js
// minute hour day-of-month month day-of-week (an optional leading field is seconds)
module.exports = {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_15_MINUTES: '*/15 * * * *',
    EVERY_HOUR: '0 * * * *',
    DAILY_MIDNIGHT: '0 0 * * *',
    DAILY_2AM: '0 2 * * *',
    WEEKLY_MONDAY_9AM: '0 9 * * 1',
    MONTHLY_FIRST: '0 0 1 * *',
};
```

`jobRunner.js`

```js
// Wraps a job: skips a tick while the previous run is still going, logs duration and errors
class JobRunner {
    constructor(jobName) {
        this.jobName = jobName;
        this.isRunning = false;
    }

    async execute(jobFunction) {
        if (this.isRunning) {
            console.warn(`[CRON] Job ${this.jobName} is already running, skipping...`);
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            const result = await jobFunction();
            console.log(`[CRON] Job ${this.jobName} completed in ${Date.now() - startTime}ms`, result);
            return result;
        } catch (error) {
            console.error(`[CRON] Job ${this.jobName} failed after ${Date.now() - startTime}ms`, error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = JobRunner;
```

`index.js`

```js
const cron = require('node-cron');
const schedules = require('./schedules');
const JobRunner = require('./jobRunner');

const helloWorld = require('./jobs/helloWorld');

class CronScheduler {
    constructor() {
        this.jobs = [];
        this.isInitialized = false;
    }

    register(name, schedule, jobFunction, options = {}) {
        const jobRunner = new JobRunner(name);

        // createTask, not schedule: in node-cron v4 schedule() starts the task immediately,
        // so `enabled: false` could not keep a job from running
        const task = cron.createTask(schedule, async () => {
            await jobRunner.execute(jobFunction);
        }, { name, timezone: options.timezone || 'Asia/Kolkata' });

        this.jobs.push({ name, schedule, task, jobFunction, jobRunner, enabled: options.enabled !== false });
    }

    init() {
        if (this.isInitialized) return;

        this.register('hello-world', schedules.EVERY_5_MINUTES, helloWorld, { enabled: true });

        this.isInitialized = true;
    }

    start() {
        this.init();
        this.jobs.filter(job => job.enabled).forEach(job => {
            job.task.start();
            console.log(`[CRON] Started job: ${job.name}`);
        });
    }

    stop() {
        this.jobs.forEach(job => job.task.stop());
    }

    async runJob(jobName) {
        this.init();
        const job = this.jobs.find(j => j.name === jobName);
        if (!job) throw new Error(`Job ${jobName} not found`);
        return job.jobRunner.execute(job.jobFunction);
    }
}

module.exports = new CronScheduler();
```

`jobs/helloWorld.js`

```js
// Sample job: proves the scheduler is running. Replace with real work.
module.exports = async () => {
    console.log('[HELLO_WORLD] Hello world');
    return { printed: 1 };
};
```

Jobs that process queues work in **batches** (e.g. at most N rows per run) and use a status column (`pending → processing → done/failed`), so a tick can resume where the last one stopped.

### `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [ "main" ]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: 'npm'
      - run: npm ci
      - run: echo "${{ secrets.DEV_ENV }}" > .env
      - run: npm install -g pm2
      - name: Start or restart pm2 process
        run: |
          pm2 delete {{PM2_NAME}} || true
          pm2 start ./app.js --name "{{PM2_NAME}}"
          pm2 save
      - run: pm2 list
```

A push to `main` deploys. Store the whole `.env` in the `DEV_ENV` repository secret.

---

## 5. Core models: users, roles, RBAC

Every project starts with these six tables. All tables share the **standard shape**: an `id` primary key, snake_case columns, plural `tableName`, `timestamps: false`, and this **audit block** at the end:

```js
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
```

To keep this file short, the models below write `/* AUDIT BLOCK */` where those seven columns go. Paste them in full in real files.

### `app/model/role/role.model.js`

```js
module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define("role", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        code: { type: DataTypes.INTEGER, allowNull: false },
        role_type: { type: DataTypes.STRING(100), allowNull: false },
        /* AUDIT BLOCK */
    }, {
        timestamps: false,
        tableName: "roles",
        indexes: [
            { fields: ['code'], name: 'idx_role_code', unique: true },
            { fields: ['status'], name: 'idx_role_status' }
        ]
    });

    return Role;
};
```

### `app/model/user/user.model.js`

```js
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("user", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        code: { type: DataTypes.STRING(20), allowNull: false },
        role_code: { type: DataTypes.INTEGER, allowNull: false },   // FK: association in model/index.js
        name: { type: DataTypes.STRING(150), allowNull: false },
        phone: { type: DataTypes.STRING(15), allowNull: false },
        email: { type: DataTypes.STRING(150), allowNull: false },
        password: { type: DataTypes.STRING(255), allowNull: true },
        failed_login_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
        last_login: { type: DataTypes.DATE, allowNull: true },
        /* AUDIT BLOCK */
    }, {
        timestamps: false,
        tableName: "users",
        indexes: [
            { fields: ['code'], name: 'idx_user_code', unique: true },
            { fields: ['email'], name: 'idx_user_email', unique: true },
            { fields: ['phone'], name: 'idx_user_phone', unique: true },
            { fields: ['status'], name: 'idx_user_status' }
        ]
    });

    // Keep password hashes out of every response that serialises a user instance.
    // Plain objects (get({ plain: true }), raw: true) bypass this, so strip them there yourself.
    User.prototype.toJSON = function () {
        const values = { ...this.get({ plain: true }) };
        delete values.password;
        return values;
    };

    return User;
};
```

### `app/model/modules/module.model.js`

```js
module.exports = (sequelize, DataTypes) => {
    const Module = sequelize.define("module", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        name: { type: DataTypes.STRING(100), allowNull: false },
        slug: { type: DataTypes.STRING(100), allowNull: false },
        /* AUDIT BLOCK */
    }, {
        timestamps: false,
        tableName: "modules",
        indexes: [
            { fields: ['slug'], name: 'idx_module_slug', unique: true },
            { fields: ['status'], name: 'idx_module_status' }
        ]
    });

    return Module;
};
```

### `app/model/modules/role_module_access_mapping.model.js`

```js
module.exports = (sequelize, DataTypes) => {
    const RoleModuleAccessMapping = sequelize.define("role_module_access_mapping", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        role_code: { type: DataTypes.INTEGER, allowNull: false },
        module_id: { type: DataTypes.INTEGER, allowNull: false },
        menu_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        read_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        write_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        update_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        delete_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        full_access: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        /* AUDIT BLOCK */
    }, {
        timestamps: false,
        tableName: "role_module_access_mapping",
        indexes: [
            { fields: ['role_code', 'module_id'], name: 'idx_role_module_access_role_module', unique: true },
            { fields: ['module_id'], name: 'idx_role_module_access_module' }
        ]
    });

    return RoleModuleAccessMapping;
};
```

### `app/model/modules/api_module_mapping.model.js`

```js
module.exports = (sequelize, DataTypes) => {
    const ApiModuleMapping = sequelize.define("api_module_mapping", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        module_id: { type: DataTypes.INTEGER, allowNull: false },
        // route pattern, not a real URL: /api/v1/catalog/categories/:categoryid
        api_endpoint: { type: DataTypes.STRING(255), allowNull: false },
        api_method: { type: DataTypes.ENUM('GET', 'POST', 'PATCH', 'PUT', 'DELETE'), allowNull: false },
        api_slug: { type: DataTypes.STRING(100), allowNull: true },
        /* AUDIT BLOCK */
    }, {
        timestamps: false,
        tableName: "api_module_mapping",
        indexes: [
            { fields: ['api_endpoint', 'api_method'], name: 'idx_api_module_mapping_endpoint_method', unique: true },
            { fields: ['module_id'], name: 'idx_api_module_mapping_module' }
        ]
    });

    return ApiModuleMapping;
};
```

### `app/model/menu/menu.model.js`

```js
module.exports = (sequelize, DataTypes) => {
    const Menu = sequelize.define("menu", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        parent_id: { type: DataTypes.INTEGER, allowNull: true },
        module_id: { type: DataTypes.INTEGER, allowNull: false },
        ranking: { type: DataTypes.INTEGER, allowNull: true },
        name: { type: DataTypes.STRING(100), allowNull: false },
        m_icon: { type: DataTypes.STRING(100), allowNull: true },
        slug: { type: DataTypes.STRING(100), allowNull: false },
        route_to: { type: DataTypes.STRING(255), allowNull: true },
        /* AUDIT BLOCK */
    }, {
        timestamps: false,
        tableName: "menus",
        indexes: [
            { fields: ['slug'], name: 'idx_menu_slug', unique: true },
            { fields: ['parent_id'], name: 'idx_menu_parent' },
            { fields: ['module_id'], name: 'idx_menu_module' }
        ]
    });

    return Menu;
};
```

**How RBAC works:**

- `roles` lists the roles, with numeric `code`s (1001 = admin; new roles get `max(code) + 1`). `users.role_code` points to `roles.code`.
- `modules` lists the feature areas of the panel (`catalog`, `orders`, …). `menus` holds the panel's sidebar tree, one menu per module.
- `role_module_access_mapping` stores what a role may do in a module: `read/write/update/delete/full_access`, plus `menu_access` for the sidebar.
- `api_module_mapping` maps an API (route pattern + method) to a module. `checkApiModuleAccess` translates the HTTP method into a flag: GET→`read_access`, POST→`write_access`, PUT/PATCH→`update_access`, DELETE→`delete_access`. `full_access` grants all of them.
- **An API with no mapping row is allowed for any logged-in user.** This is intentional: you lock an API down by adding a row.

---

## 6. Core module: auth + RBAC check

### `app/middlewares/auth.middleware.js`

```js
const jwt = require('jsonwebtoken');
const CustomError = require('../lib/custom.error');
const { errorResponse } = require('../lib/response.handler');
const userService = require('../service/user.service');
const rbacService = require('../service/rbac.service');

// JWT from the x-access-token header -> req.user (password stripped by the model's toJSON)
const protect = async (req, res, next) => {
    try {
        const token = req.headers['x-access-token'];
        if (!token) {
            throw new CustomError('token_missing', 401, "Token not provided");
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        } catch (err) {
            throw new CustomError('token_invalid', 401, "Token is invalid or expired");
        }

        const user = await userService.getUserByIdAndRoleCode(decoded.id, decoded.role_code);
        if (!user || user.status !== 'active') {
            throw new CustomError('user_not_active', 401, "User not found or not active");
        }

        req.user = user.toJSON();
        next();
    } catch (err) {
        errorResponse(res, 'protect', err);
    }
};

// Must run after protect. Allows only users whose role is one of roleCodes, e.g. restrictTo(ROLE_CODES.ADMIN)
const restrictTo = (...roleCodes) => (req, res, next) => {
    if (!req.user || !roleCodes.includes(req.user.role_code)) {
        return errorResponse(res, 'restrictTo',
            new CustomError('role_access_error', 403, "You do not have permission to access this API"));
    }
    next();
};

// Must run after protect, as route-level middleware (req.route is not set in app.use/router.use).
// The API is identified by its route pattern, e.g. PATCH /api/v1/catalog/categories/:categoryid,
// so api_module_mapping.api_endpoint must store the same pattern.
const checkApiModuleAccess = async (req, res, next) => {
    try {
        const api_endpoint = req.baseUrl + req.route.path;
        const api_method = req.method.toUpperCase();

        const { mapped, allowed, access } = await rbacService.checkApiAccess(req.user.role_code, api_endpoint, api_method);

        if (!allowed) {
            throw new CustomError('module_access_error', 403, "You do not have permission to access this API");
        }

        if (mapped) req.user.allowedPermission = access;
        next();
    } catch (err) {
        errorResponse(res, 'checkApiModuleAccess', err);
    }
};

module.exports = {
    protect,
    restrictTo,
    checkApiModuleAccess
};
```

### `app/service/rbac.service.js` (the access check; add roles/modules CRUD with §7)

```js
const db = require('../model');

const METHOD_ACCESS_FLAG = {
    GET: 'read_access',
    POST: 'write_access',
    PUT: 'update_access',
    PATCH: 'update_access',
    DELETE: 'delete_access'
};

// { mapped: false } = API not mapped to a module = allowed for every logged-in user
exports.checkApiAccess = async (role_code, api_endpoint, api_method) => {
    try {
        const mapping = await db.apiModuleMapping.findOne({
            where: { api_endpoint, api_method, status: 'active', deleted: false },
            attributes: ['id', 'module_id'],
            raw: true
        });
        if (!mapping) return { mapped: false, allowed: true, access: null };

        const access = await db.roleModuleAccessMapping.findOne({
            where: { role_code, module_id: mapping.module_id, deleted: false },
            raw: true
        });
        if (!access) return { mapped: true, allowed: false, access: null };

        const requiredFlag = METHOD_ACCESS_FLAG[api_method];
        const allowed = !!(access.full_access || (requiredFlag && access[requiredFlag]));

        return { mapped: true, allowed, access };
    } catch (err) {
        throw err;
    }
};
```

### `app/service/user.service.js` (auth essentials)

```js
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const db = require('../model');

const roleInclude = { model: db.role, as: 'role', attributes: ['code', 'role_type'] };

// Login looks users up by email or phone alone, so both are unique across all roles
exports.getUserInfoByUsername = async (username) => {
    try {
        return await db.user.findOne({
            where: { deleted: false, [Op.or]: [{ email: username }, { phone: username }] },
            include: [roleInclude]
        });
    } catch (err) {
        throw err;
    }
};

exports.getUserByIdAndRoleCode = async (id, role_code) => {
    try {
        return await db.user.findOne({ where: { id, role_code, deleted: false }, include: [roleInclude] });
    } catch (err) {
        throw err;
    }
};

exports.hashPassword = (password) => bcrypt.hash(password, 12);

exports.recordSuccessfulLogin = (user_id) =>
    db.user.update({ last_login: new Date(), failed_login_attempts: 0 }, { where: { id: user_id, deleted: false } });

exports.incrementFailedLoginAttempts = (user_id) =>
    db.user.increment('failed_login_attempts', { where: { id: user_id, deleted: false } });
```

### `app/controller/user.controller.js` (login + me)

```js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const userService = require('../service/user.service');

const TOKEN_TTL_SECONDS = 86400;
const MAX_FAILED_LOGINS = 5;

// ─── Auth ─────────────────────────────────────────────────────────────────

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await userService.getUserInfoByUsername(username);
        // one message for unknown user and wrong password, so accounts can't be probed
        if (!user) {
            throw new CustomError('auth_error', 400, "Invalid credentials");
        }

        if (user.failed_login_attempts >= MAX_FAILED_LOGINS) {
            throw new CustomError('auth_error', 400, "Account locked due to multiple failed login attempts, please contact admin");
        }

        if (!user.password || !await bcrypt.compare(password, user.password)) {
            await userService.incrementFailedLoginAttempts(user.id);
            throw new CustomError('auth_error', 400, "Invalid credentials");
        }

        if (user.status !== 'active') {
            throw new CustomError('auth_error', 400, "User is not active, please contact admin");
        }

        const token = jwt.sign({ id: user.id, role_code: user.role_code }, process.env.JWT_SECRET_KEY, { expiresIn: TOKEN_TTL_SECONDS });
        await userService.recordSuccessfulLogin(user.id);

        successResponse(res, "User logged in successfully", { token, user_info: user });
    } catch (err) {
        errorResponse(res, 'loginUser', err);
    }
};

const getMe = async (req, res) => {
    try {
        successResponse(res, "User info fetched", { user_info: req.user });
    } catch (err) {
        errorResponse(res, 'getMe', err);
    }
};

module.exports = {
    // Auth
    loginUser,
    getMe
};
```

### `app/router/user.router.js`

```js
const express = require('express');
const userCtrl = require('../controller/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { userSchemas } = require('../utils/validation.schemas');
const router = express.Router();

// =====================
// AUTH ROUTES
// =====================

// Public: no token yet
router.route("/login")
    .post(validateBody(userSchemas.login), userCtrl.loginUser);

router.route("/me")
    .get(authMiddleware.protect, userCtrl.getMe);

module.exports = router;
```

### Seeders for roles + admin user

`app/seeders/20260101000000-insert-default-roles.js`

```js
'use strict';

const roles = [
  { code: 1001, role_type: 'Admin' }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const existing = await queryInterface.sequelize.query(`SELECT code FROM roles`, { type: Sequelize.QueryTypes.SELECT });
    const existingCodes = new Set(existing.map(r => r.code));

    const rows = roles
      .filter(r => !existingCodes.has(r.code))
      .map(r => ({ ...r, status: 'active', created_at: now, modified_at: now, deleted: false }));

    if (rows.length) await queryInterface.bulkInsert('roles', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', { code: roles.map(r => r.code) });
  }
};
```

`app/seeders/20260101000100-insert-default-users.js`

```js
'use strict';

const bcrypt = require('bcrypt');

const admin = { code: '{{CODE_PREFIX}}USR00001', role_code: 1001, name: 'Admin', email: 'admin@example.com', phone: '9999999999' };

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!process.env.SEED_ADMIN_PASSWORD) throw new Error('Set SEED_ADMIN_PASSWORD in .env first');

    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE code = :code OR email = :email`,
      { replacements: admin, type: Sequelize.QueryTypes.SELECT }
    );
    if (existing) return;

    const now = new Date();
    await queryInterface.bulkInsert('users', [{
      ...admin,
      password: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12),
      failed_login_attempts: 0,
      status: 'active', created_at: now, modified_at: now, deleted: false
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { code: admin.code });
  }
};
```

---

## 7. Module recipe (copy per entity)

This is a worked example: the entity **category** in the area **catalog**. Table `categories`, routes at `/api/v1/catalog/categories`. When you copy it, rename every form of the name consistently:

| Form | Example | Used for |
|---|---|---|
| Area file stem | `catalog` | `catalog.router.js`, `catalog.controller.js`, `catalog.service.js`, `catalog.swagger.js` |
| db key | `db.category` | camelCase, registered in `model/index.js` |
| Define name / table | `"category"` / `"categories"` | singular snake_case / plural snake_case |
| Path param | `:categoryid` | lowercase, no separators |
| Joi group | `catalogSchemas` | `exports.catalogSchemas = { getCategories, categoryid, createCategory, updateCategory }` |
| Error names | `category_not_found`, `category_exists`, `category_in_use` | snake_case |
| Handlers | `getAllCategories`, `getSingleCategory`, `createCategory`, `updateCategory`, `deleteCategory` | |

### 7.1 Model — `app/model/catalog/category.model.js`

```js
module.exports = (sequelize, DataTypes) => {
    const Category = sequelize.define("category", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
        },
        parent_code: {
            type: DataTypes.STRING(20),
            allowNull: true       // FK: association in app/model/index.js
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active'
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        modified_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        modified_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        timestamps: false,
        tableName: "categories",
        indexes: [
            { fields: ['code'], name: 'idx_category_code', unique: true },
            { fields: ['parent_code'], name: 'idx_category_parent' },
            { fields: ['status'], name: 'idx_category_status' }
        ]
    });

    return Category;
};
```

Register it and add its associations in `app/model/index.js`:

```js
db.category = require('./catalog/category.model')(sequelize, DataTypes);

// Category tree by code (a parent can't be deleted while it has children)
db.category.belongsTo(db.category, { foreignKey: 'parent_code', targetKey: 'code', as: 'parent', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
db.category.hasMany(db.category, { foreignKey: 'parent_code', sourceKey: 'code', as: 'children', onDelete: 'NO ACTION', onUpdate: 'CASCADE' });
```

### 7.2 Joi schemas — append to `app/utils/validation.schemas.js`

```js
// ─── Catalog ──────────────────────────────────────────────────────────────

exports.catalogSchemas = {
    getCategories: Joi.object({
        page: commonPatterns.page,
        limit: commonPatterns.limit.default(20),
        search: Joi.string().trim().max(100).optional(),
        parent_code: Joi.string().trim().uppercase().max(20).optional(),
        status: commonPatterns.status.optional()
    }),

    categoryid: Joi.object({
        categoryid: commonPatterns.id
    }),

    createCategory: Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        code: Joi.string().trim().uppercase().max(20).required(),
        parent_code: Joi.string().trim().uppercase().max(20).optional().allow(null),
        status: commonPatterns.status.optional()
    }),

    // every field optional, at least one required
    updateCategory: Joi.object({
        name: Joi.string().trim().min(2).max(100).optional(),
        code: Joi.string().trim().uppercase().max(20).optional(),
        parent_code: Joi.string().trim().uppercase().max(20).optional().allow(null),
        status: commonPatterns.status.optional()
    }).min(1)
};
```

### 7.3 Service — `app/service/catalog.service.js`

```js
const db = require('../model');
const { Op } = require('sequelize');

// ─── Categories ───────────────────────────────────────────────────────────

// List: takes the controller's whereCondition, returns { data, pagination }
exports.getCategories = async (whereCondition = { deleted: false }, page = 1, limit = 20) => {
    try {
        const offset = (page - 1) * limit;

        const { count, rows } = await db.category.findAndCountAll({
            where: whereCondition,
            include: [{ model: db.category, as: 'parent', attributes: ['code', 'name'] }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            // distinct so the count is categories, not category-rows-times-joins
            distinct: true
        });

        return {
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    } catch (err) {
        throw err;
    }
};

exports.getCategoryById = async (categoryId) => {
    try {
        return await db.category.findOne({
            where: { id: categoryId, deleted: false },
            include: [{ model: db.category, as: 'parent', attributes: ['code', 'name'] }]
        });
    } catch (err) {
        throw err;
    }
};

exports.categoryCodeExists = async (code, excludeId = null) => {
    try {
        // includes soft-deleted rows: categories.code is unique across all rows
        const whereCondition = { code };
        if (excludeId) whereCondition.id = { [Op.ne]: excludeId };
        return !!(await db.category.findOne({ where: whereCondition, attributes: ['id'] }));
    } catch (err) {
        throw err;
    }
};

exports.getCategoryUsageCount = async (categoryId) => {
    try {
        const category = await db.category.findByPk(categoryId, { attributes: ['code'] });
        if (!category) return 0;
        return await db.category.count({ where: { parent_code: category.code, deleted: false } });
    } catch (err) {
        throw err;
    }
};

exports.createCategory = async (payload, meta = {}) => {
    try {
        // columns listed explicitly: nothing else the client sends can reach the table
        return await db.category.create({
            name: payload.name,
            code: payload.code,
            parent_code: payload.parent_code || null,
            status: payload.status || 'active',
            deleted: false,
            created_at: new Date(),
            created_by: meta.userId || null,
            modified_at: new Date(),
            modified_by: null,
            ip_address: meta.ip || null
        });
    } catch (err) {
        throw err;
    }
};

exports.updateCategory = async (categoryId, payload, meta = {}) => {
    try {
        // update skips undefined values, so only the fields that were sent change
        const [updated] = await db.category.update({
            name: payload.name,
            code: payload.code,
            parent_code: payload.parent_code,
            status: payload.status,
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { id: categoryId, deleted: false } });

        if (!updated) return null;
        return await exports.getCategoryById(categoryId);
    } catch (err) {
        throw err;
    }
};

exports.deleteCategory = async (categoryId, meta = {}) => {
    try {
        const [updated] = await db.category.update({
            deleted: true,
            status: 'inactive',
            modified_at: new Date(),
            modified_by: meta.userId || null,
            ip_address: meta.ip || null
        }, { where: { id: categoryId, deleted: false } });

        return !!updated;
    } catch (err) {
        throw err;
    }
};
```

A write that spans several tables, or that changes money or counters, is **one** service function that owns its transaction:

```js
exports.transferStock = async (fromId, toId, qty, meta = {}) => {
    const t = await db.sequelize.transaction();
    try {
        // lock the source row so two transfers can't both pass the stock check
        const from = await db.stock.findOne({ where: { id: fromId, deleted: false }, lock: t.LOCK.UPDATE, transaction: t });
        if (!from || from.quantity < qty) {
            await t.rollback();
            return null;
        }
        await from.decrement('quantity', { by: qty, transaction: t });
        await db.stock.increment('quantity', { by: qty, where: { id: toId }, transaction: t });
        await t.commit();
        return true;
    } catch (err) {
        await t.rollback();
        throw err;
    }
};
```

### 7.4 Controller — `app/controller/catalog.controller.js`

```js
const { Op } = require('sequelize');
const CustomError = require('../lib/custom.error');
const { errorResponse, successResponse } = require('../lib/response.handler');
const catalogService = require('../service/catalog.service');
const { getMeta } = require('../helper/common.helper');

// ─── Categories ───────────────────────────────────────────────────────────

const getAllCategories = async (req, res) => {
    try {
        // page/limit are validated, converted and defaulted by validateQuery in the router
        const { page, limit, search, parent_code, status } = req.query;

        let whereCondition = { deleted: false };

        if (parent_code) {
            whereCondition.parent_code = parent_code;
        }
        if (status) {
            whereCondition.status = status;
        }
        if (search) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } }
            ];
        }

        const categories = await catalogService.getCategories(whereCondition, page, limit);
        successResponse(res, "Categories fetched successfully", categories);
    } catch (err) {
        errorResponse(res, 'getAllCategories', err);
    }
};

const getSingleCategory = async (req, res) => {
    try {
        const category = await catalogService.getCategoryById(req.params.categoryid);

        if (!category) {
            throw new CustomError('category_not_found', 404, "Category not found");
        }

        successResponse(res, "Category info fetched", category);
    } catch (err) {
        errorResponse(res, 'getSingleCategory', err);
    }
};

const createCategory = async (req, res) => {
    try {
        const exists = await catalogService.categoryCodeExists(req.body.code);
        if (exists) {
            throw new CustomError('category_exists', 400, "Category with this code already exists");
        }

        const category = await catalogService.createCategory(req.body, getMeta(req));
        successResponse(res, "Category created successfully", category);
    } catch (err) {
        errorResponse(res, 'createCategory', err);
    }
};

const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryid;

        if (req.body.code) {
            const exists = await catalogService.categoryCodeExists(req.body.code, categoryId);
            if (exists) {
                throw new CustomError('category_exists', 400, "Category with this code already exists");
            }
        }

        const category = await catalogService.updateCategory(categoryId, req.body, getMeta(req));
        if (!category) {
            throw new CustomError('category_not_found', 404, "Category not found");
        }

        successResponse(res, "Category updated successfully", category);
    } catch (err) {
        errorResponse(res, 'updateCategory', err);
    }
};

const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryid;

        const usage = await catalogService.getCategoryUsageCount(categoryId);
        if (usage > 0) {
            throw new CustomError('category_in_use', 400, "Category has sub-categories and can't be deleted");
        }

        const deleted = await catalogService.deleteCategory(categoryId, getMeta(req));
        if (!deleted) {
            throw new CustomError('category_not_found', 404, "Category not found");
        }

        successResponse(res, "Category deleted successfully");
    } catch (err) {
        errorResponse(res, 'deleteCategory', err);
    }
};

module.exports = {
    // Categories
    getAllCategories,
    getSingleCategory,
    createCategory,
    updateCategory,
    deleteCategory
};
```

### 7.5 Router — `app/router/catalog.router.js`

```js
const express = require('express');
const catalogCtrl = require('../controller/catalog.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validateBody, validateParams, validateQuery } = require('../middlewares/validation.middleware');
const { catalogSchemas } = require('../utils/validation.schemas');
const router = express.Router();

// =====================
// CATEGORIES ROUTES
// =====================

router.route("/categories")
    .get(authMiddleware.protect, validateQuery(catalogSchemas.getCategories), catalogCtrl.getAllCategories)
    .post(authMiddleware.protect, authMiddleware.checkApiModuleAccess, validateBody(catalogSchemas.createCategory), catalogCtrl.createCategory);

router.route("/categories/:categoryid")
    .get(authMiddleware.protect, validateParams(catalogSchemas.categoryid), catalogCtrl.getSingleCategory)
    .patch(authMiddleware.protect, authMiddleware.checkApiModuleAccess, validateParams(catalogSchemas.categoryid), validateBody(catalogSchemas.updateCategory), catalogCtrl.updateCategory)
    .delete(authMiddleware.protect, authMiddleware.checkApiModuleAccess, validateParams(catalogSchemas.categoryid), catalogCtrl.deleteCategory);

module.exports = router;
```

Mount it in `app/router/index.js`. A router that isn't mounted fails silently with 404s.

```js
        app.use('/api/v1/catalog', require('./catalog.router'));
```

### 7.6 Swagger — `app/docs/catalog.swagger.js`

```js
/**
 * @swagger
 * tags:
 *   - name: Catalog
 *     description: Category master data
 *
 * components:
 *   schemas:
 *     CatalogCategory:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         code: { type: string, example: "ELEC" }
 *         name: { type: string, example: "Electronics" }
 *         parent_code: { type: string, nullable: true, example: null }
 *         status: { type: string, enum: [active, inactive] }
 */

/**
 * @swagger
 * /api/v1/catalog/categories:
 *   get:
 *     summary: List categories
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string }, description: Partial match on name or code }
 *       - { in: query, name: status, schema: { type: string, enum: [active, inactive] } }
 *     responses:
 *       200:
 *         description: resData holds data + pagination
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     resData:
 *                       type: object
 *                       properties:
 *                         data: { type: array, items: { $ref: '#/components/schemas/CatalogCategory' } }
 *                         pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       400: { description: Invalid query parameters, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   post:
 *     summary: Create a category
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               parent_code: { type: string, nullable: true }
 *           example: { name: "Electronics", code: "ELEC" }
 *     responses:
 *       200: { description: Category created, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }
 *       400: { description: "Validation error, or the code already exists (category_exists)", content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       401: { description: Missing or invalid token, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       403: { description: Role has no permission for this API, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
```

Continue the same way for `/api/v1/catalog/categories/{categoryid}`. Put the path `parameters` at path level, then get/patch/delete, documenting 200/400/401/403/404 as they apply.

### 7.7 Seeder — `app/seeders/<YYYYMMDDHHmmss>-insert-categories.js`

```js
'use strict';

const categories = require('../data/categories.json');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // code is unique; skip rows that already exist so the seeder can be re-run
    const existing = await queryInterface.sequelize.query(`SELECT code FROM categories`, { type: Sequelize.QueryTypes.SELECT });
    const existingCodes = new Set(existing.map(r => r.code));

    const rows = categories
      .filter(r => !existingCodes.has(r.code))
      .map(r => ({ name: r.name, code: r.code, parent_code: r.parent_code || null, status: 'active', created_at: now, modified_at: now, deleted: false }));

    if (rows.length) await queryInterface.bulkInsert('categories', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('categories', { code: categories.map(r => r.code) });
  }
};
```

### 7.8 Migration (changing an existing table) — `app/migrations/<YYYYMMDDHHmmss>-add-sort-order-to-categories.js`

```js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('categories', 'sort_order', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, after: 'code' });
    await queryInterface.addIndex('categories', ['sort_order'], { name: 'idx_category_sort_order' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('categories', 'idx_category_sort_order');
    await queryInterface.removeColumn('categories', 'sort_order');
  }
};
```

Update the model in the same change. `sync({ force: false })` never adds the column for you.

### 7.9 Lock the write APIs (RBAC rows)

To permission-control the module, add a `modules` row (`slug: 'catalog'`), `api_module_mapping` rows for each write route pattern (`/api/v1/catalog/categories` POST, `/api/v1/catalog/categories/:categoryid` PATCH/DELETE), and `role_module_access_mapping` rows for each role. Put them in a seeder and reference the module by `slug`, never by id.

---

## 8. Conventions reference

### Routers

- Use `router.route(path).get(...).post(...)` chaining. Group routes per entity under a banner comment:
  ```js
  // =====================
  // CATEGORIES ROUTES
  // =====================
  ```
- Path params are lowercase with no separators: `:categoryid`, `:userid`.
- **Every route uses `protect`** unless it is genuinely public (login, self-registration, public lookups). Write routes (POST/PATCH/PUT/DELETE) also get `checkApiModuleAccess`. Fixed-role routes add `restrictTo(ROLE_CODES.X)` after `protect`.
- A whole router can be guarded with `router.use(authMiddleware.protect, authMiddleware.restrictTo(...))` at the top (admin-only areas). Note that this also runs for paths the router doesn't define, so an unknown path there answers 401/403 instead of 404.
- Public routes still validate with Joi. They get the most garbage input.
- **Declare literal paths before param paths:** `/categories/tree` must come before `/categories/:categoryid`.
- Parse nothing in controllers. `validateQuery` converts `"2"` → `2` and applies defaults.

### Controllers

- `const handlerName = async (req, res) => { try { ... } catch (err) { errorResponse(res, 'handlerName', err); } };`
- Export every handler at the bottom in one `module.exports = { ... }`, grouped with `// Section` comments. Divide the file into sections with `// ─── Name ───...` banners.
- 4xx = `throw new CustomError('<snake_case>', httpCode, "Human message")`. Standard names: `<entity>_exists` (400), `<entity>_not_found` (404), `<entity>_in_use` (400).
- Existence, duplicate and in-use checks happen in the controller through small service helpers. Then the controller calls the write.
- **List endpoints:** the controller destructures the query, starts from `let whereCondition = { deleted: false };`, adds one braced `if` per filter (`Op.like` with `%term%` for partial matches, `Op.or` for a search box), then calls `service.getX(whereCondition, page, limit)`. Access scoping ("a user only sees their own rows") is also added to `whereCondition` here.
- Pass `getMeta(req)` (`{ userId, ip }`) to every write service, for the audit columns.

### Services

- `exports.fn = async (...) => { try { ... } catch (err) { throw err; } }`. Keep the wrapper for consistency.
- There is no generic CRUD service. Every query is a named function in the service that owns the table.
- **Lists** take `(whereCondition = { deleted: false }, page = 1, limit = N)`, use `findAndCountAll`, add `distinct: true` when there are `include`s, and return `{ data, pagination: { total, page, limit, totalPages } }`.
- **Writes list their columns explicitly.** Never spread `req.body`, `payload` or `...rest` into `create`/`update`/`bulkCreate`: an extra field (`deleted`, `created_by`, `status`, `user_id`) would be written. When several writes share a column set, define it once in a small function.
- **create** sets every audit column. **update** returns the fresh row, or `null` when nothing matched. **delete** is a soft delete (`deleted: true, status: 'inactive'`) and returns a boolean.
- Multi-table writes and money/stock/seat changes run in one transaction owned by the service function, with `lock: t.LOCK.UPDATE` on counter rows.
- Use `Promise.all` for independent reads.
- Services must not `require` each other in cycles. When a flow spans several services (e.g. create user + profile), put it in a dedicated orchestration service (`registration.service.js`) that requires the others.
- Raw SQL (`db.sequelize.query` with **named replacements**, `type: QueryTypes.SELECT`) is only for multi-table aggregates (reports). Everything else uses models.

### Validation

- All schemas live in `app/utils/validation.schemas.js`, as `exports.<area>Schemas = { ... }`. Reuse `commonPatterns`.
- Param schemas are named after the param (`categoryid`). List query schemas are `get<Entities>`. Body schemas are `create<Entity>` / `update<Entity>`.
- Update schemas make every field optional and add `.min(1)`.
- The middleware uses `stripUnknown: true`, so a field missing from the schema never reaches the controller. Add new fields to the schema first.
- When two routes accept the same input (e.g. a panel API and a partner API), point both at the **same** schema object so they can't drift.

### Code style

- CommonJS, 4-space indentation (2 in generated migrations/seeders), semicolons.
- Single quotes for `require` paths, double quotes for human messages.
- `async/await` only: no callbacks, no `.then` chains in app code.
- Use early `throw new CustomError` instead of nested `if`s.
- Comments are sparse and explain *why* (a constraint, a race, a business rule), not what. No JSDoc in code. Swagger JSDoc lives only in `app/docs/`.
- No `console.log` debugging left in committed code.

### Naming quick reference

| Thing | Convention | Example |
|---|---|---|
| Table | plural snake_case | `role_module_access_mapping`, `categories` |
| Column | snake_case | `parent_code`, `created_at` |
| Index | `idx_<entity>_<column(s)>` | `idx_category_code` |
| db key | camelCase | `db.roleModuleAccessMapping` |
| Association alias | camelCase, singular for belongsTo, plural for hasMany | `as: 'parent'`, `as: 'children'` |
| Route | `/api/v1/<area>/<kebab-plural>` | `/api/v1/catalog/categories` |
| Business code | `{{CODE_PREFIX}}<TYPE><zero-padded seq>` | `{{CODE_PREFIX}}USR00001` |
| Error name | snake_case | `category_not_found` |

---

## 9. Database rules

1. **Standard table shape:** an `id` PK, snake_case columns, explicit plural `tableName`, `timestamps: false`, and the 7-column audit block (`status, created_at, created_by, modified_at, modified_by, ip_address, deleted`).
2. **Soft delete everywhere.** Every read filters `deleted: false`. Deletes set `deleted: true, status: 'inactive'`.
3. **Unique indexes include soft-deleted rows.** Duplicate checks for unique columns must search all rows, deleted ones included. Otherwise a deleted row's value passes the check and the insert fails with a 500.
4. **Indexes** are declared in the model's `indexes` array, named `idx_<entity>_<column>`.
5. **Foreign keys exist only as associations in `model/index.js`.** The model declares just the plain column. Every association has an explicit `foreignKey`, `as`, `onDelete` and `onUpdate`: `'NO ACTION'` to restrict, `'CASCADE'` for owned child rows, `'SET NULL'` for optional links. Both sides of a pair use the same values. Non-`id` targets use `targetKey` / `sourceKey`.
6. **Includes always use `as`.** Adding a second association between the same two models breaks includes that omit it.
7. **Reference master data by business code, not id**, when the code is stable and unique (`role_code → roles.code`, `parent_code → categories.code`). APIs accept and return codes. Ids stay internal.
8. **Schema changes:** new tables are created by `sync({ force: false })` on the next start. Changes to existing tables need a migration plus the model change in the same commit. `sync` never alters existing tables. **Never `force: true`**: it drops every table.
9. **Seeders:** `queryInterface` only, never `require('../model')` (that runs `sync` against the DB). Make `up` skip rows that already exist and make `down` remove only what `up` inserted. Reference other seeded rows by stable keys (slug/code), never ids. Keep large master data in `app/data/*.json`. Never put real password hashes or secrets in a seeder. Mirror the dev DB: when master data is added through the app, add it to a seeder too.
10. **Dates:** compare `DATEONLY` columns as `'YYYY-MM-DD'` strings (`toDateOnly`). For "today" inside a query, use `fn('CURDATE')` so the DB's date is used instead of the Node process's UTC date.
11. **Secrets:** hash passwords (and API secrets) with bcrypt. Never return `password` fields: the user model's `toJSON` strips them, but `raw: true` / `get({ plain: true })` bypass it.

---

## 10. Swagger, Postman, README

**Swagger** (`app/docs/<area>.swagger.js`, one file per area, JSDoc blocks only):
- Start with `tags`, then area components prefixed with the area name (`CatalogCategory`), then one block per path.
- Use full paths (`/api/v1/catalog/categories/{categoryid}`). Put `security: - bearerAuth: []` on protected operations only. Public ones say "Public, no token needed".
- `$ref` the shared `SuccessResponse`, `Error` and `PaginationResponse` schemas. The payload is in `resData`, not `data`.
- Give every request body a realistic `example`.
- Document every status the handler can return (200; 400 for validation/duplicate; 401; 403 when `checkApiModuleAccess`/`restrictTo` is on the route; 404). Don't document 500.
- Check the spec builds: `node -e "const s=require('./app/config/swagger'); console.log(Object.keys(s.paths))"`.

**Postman:** keep one collection in the repo, with one folder per area and one request per mounted route. The collection-level auth is an API-key header `x-access-token: {{token}}`. Public requests set `"auth": { "type": "noauth" }`.

**README sections:** Getting started (prerequisites, setup, run, background jobs) · Project structure · API areas table (`area | base path | router | notes`) · API conventions (request flow, responses, validation) · Authentication and permissions · Database (sync, table conventions, migrations, seeders) · Adding a new module · Postman · Deployment · Known issues.

---

## 11. Pitfalls

| Pitfall | Rule |
|---|---|
| `sync({ force: true })` | Wipes every table in every process that loads `app/model` (server, scripts, `node -e`). Never use it. |
| Model change without migration | `sync({ force: false })` doesn't add columns, so you get "Unknown column" at runtime. Write the migration and run `db:migrate`. |
| Router not mounted | Silent 404s. Mount every router in `router/index.js`. |
| `/:id` before a literal path | `/:categoryid` swallows `/tree`. Declare literal paths first. |
| `checkApiModuleAccess` in `router.use` | `req.route` is undefined there. It must be route-level, after `protect`. |
| Mapping stored with a real id | `api_module_mapping.api_endpoint` must store the route pattern (`/…/:categoryid`). |
| Assigning `req.query` | Express 5 makes it a getter. The validation middleware redefines it instead. |
| `const [row] = await sequelize.query(sql, { type: SELECT })` | With `type: SELECT` the result is already the rows array, so `row` is the first row and `row[0]` is undefined. |
| `raw: true` on users | Bypasses `toJSON`, so password hashes leak. Strip them or don't use `raw`. |
| Duplicate check with `deleted: false` on a unique column | A deleted row's value passes the check and the insert fails with a 500. Check across all rows. |
| `findAndCountAll` + `include` without `distinct: true` | The count is multiplied by the joined rows. |
| Spreading the body into `create` | Clients can set `deleted`, `created_by`, `status`… List the columns. |
| Service A requires B requires A | Half-initialised `module.exports`. Use an orchestration service. |
| Seeder requiring `app/model` or a helper that requires it | Runs `sync` against the DB. Use `queryInterface` and generate codes in SQL. |
| Two associations between the same models | Includes without `as` break. Always give `as`. |
| Process UTC date vs DB date | Use `fn('CURDATE')` for "today" in queries. |

---

## 12. New project checklist

1. `git init`, then create `package.json` (§1) and `npm install`.
2. Copy `.gitignore`, `.env.example` → `.env` (fill it in), `.sequelizerc`.
3. Create the folder tree (§2).
4. Copy the foundation files (§4): config (`config.js`, `index.js`, `dev/uat/prod.json`, `swagger.js`), `lib/`, `middlewares/validation.middleware.js`, `utils/validation.schemas.js`, `helper/` (common, query, code_generator), `constants/role.constant.js`, `model/index.js`, `router/index.js`, `cron/`, `app.js`.
5. Add the core models (§5) and the auth/RBAC module (§6): `auth.middleware.js`, `rbac.service.js`, `user.service.js`, `user.controller.js`, `user.router.js`.
6. Replace every `{{PLACEHOLDER}}`.
7. Start once with `npm run dev`. `sync` creates the tables. Then run `npx sequelize-cli db:seed:all` to add the admin role and user.
8. Check: `POST /api/v1/users/login` → token, `GET /api/v1/users/me` with `x-access-token`, `/api-docs` loads.
9. Add `app/docs/user.swagger.js` and a Postman collection.
10. Add the deploy workflow (§4) and the `DEV_ENV` secret.
11. For each feature: follow the module recipe (§7) and the checklist below.

### New module checklist

1. Model in `app/model/<folder>/<name>.model.js`. Register it in `model/index.js` and add its associations there.
2. Joi schemas: `exports.<area>Schemas` in `validation.schemas.js`.
3. Service: `app/service/<area>.service.js`.
4. Controller: `app/controller/<area>.controller.js`.
5. Router: `app/router/<area>.router.js`, **and mount it** in `router/index.js`.
6. Swagger: `app/docs/<area>.swagger.js`. Add the requests to the Postman collection.
7. Seeder (master data) and/or migration (changes to existing tables).
8. RBAC rows (`modules`, `api_module_mapping`, `role_module_access_mapping`) if the writes must be permission-controlled.
9. README: update the API areas table and anything else that changed.

---

## 13. Differences from the source project

The code above follows `supplier_booking_backend`'s architecture, but it fixes a few things that are known weak spots there. Keep these fixes in new projects:

| Source project | Blueprint |
|---|---|
| `protect` answers 400 for a missing/expired token, logs the user | 401, no debug logs |
| `req.user = user.get({ plain: true })` keeps the password hash on `req.user` | `req.user = user.toJSON()` (hash stripped) |
| `errorResponse` sends the raw error object as `resData` (can leak SQL/stack on 500s) | `resData` is `null` on 500 and `{ error: name }` on 4xx |
| Swagger `SuccessResponse` documents `data` | Documents `statusCode` + `resData`, matching the real envelope |
| `sequelize.authenticate()` not awaited (the "success" log always prints) | `.then/.catch` logs the real result |
| `config/index.js` returns `undefined` when `NODE_ENV` is unset | Falls back to `dev.json` |
| Login validates with an inline Joi schema in the controller | `validateBody(userSchemas.login)` in the router |
| User-code generator skips soft-deleted rows (can produce a duplicate code) | Looks at every row; can run inside the insert's transaction |
| Default-users seeder uses a hard-coded password | Reads `SEED_ADMIN_PASSWORD` from `.env` |
| `getMeta` redefined in every controller | One `getMeta` in `helper/common.helper.js` |
| `.sequelizerc` `models-path` points at an unused `app/models` | Points at `app/model` |
| `role_module_access_mapping` flags all default to `true` (a new row grants everything) | Only `menu_access` / `read_access` default to `true`; write/update/delete/full default to `false` |
| Unused deps (`sqlite3`, `express-mongo-sanitize`, `xss-clean`) | Dropped; `nodemon` / `sequelize-cli` are devDependencies |
