require('dotenv').config();

const db = {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    // same session time zone as app/model/index.js, so seeded dates match app-written ones
    timezone: process.env.DB_TIMEZONE || '+05:30'
};

module.exports = {
    development: db,
    test: db,
    production: db
};
