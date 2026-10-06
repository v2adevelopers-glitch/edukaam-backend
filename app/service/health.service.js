const db = require('../model');

// true when the database answers a trivial query
exports.isDatabaseUp = async () => {
    try {
        await db.sequelize.query('SELECT 1');
        return true;
    } catch (err) {
        return false;
    }
};
