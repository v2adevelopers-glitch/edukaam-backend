const configs = {
    development: './dev.json',
    testing: './uat.json',
    production: './prod.json'
};

module.exports = require(configs[process.env.NODE_ENV] || configs.development);
