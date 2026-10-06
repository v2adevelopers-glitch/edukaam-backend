const db = require('../model');

const COMP_PREFIX = "EDJ";

const PREFIX = {
    USER: `${COMP_PREFIX}USR`,
    JOB_CATEGORY: `${COMP_PREFIX}CAT`,
    INSTITUTION_TYPE: `${COMP_PREFIX}ITY`,
    STATE: `${COMP_PREFIX}STA`,
    CITY: `${COMP_PREFIX}CTY`,
    JOB: `${COMP_PREFIX}JOB`,
    APPLICATION: `${COMP_PREFIX}APP`,
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

exports.PREFIX = PREFIX;

exports.generateUserCode = (transaction = null) => nextCode(db.user, 'code', PREFIX.USER, 5, transaction);
exports.generateJobCategoryCode = (transaction = null) => nextCode(db.jobCategory, 'code', PREFIX.JOB_CATEGORY, 5, transaction);
exports.generateInstitutionTypeCode = (transaction = null) => nextCode(db.institutionType, 'code', PREFIX.INSTITUTION_TYPE, 5, transaction);
exports.generateStateCode = (transaction = null) => nextCode(db.state, 'code', PREFIX.STATE, 5, transaction);
exports.generateCityCode = (transaction = null) => nextCode(db.city, 'code', PREFIX.CITY, 5, transaction);
exports.generateJobCode = (transaction = null) => nextCode(db.job, 'code', PREFIX.JOB, 5, transaction);
exports.generateApplicationCode = (transaction = null) => nextCode(db.application, 'code', PREFIX.APPLICATION, 5, transaction);
