const { QueryTypes } = require('sequelize');
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

const seqOf = (code, prefix) => {
    if (!code) return 0;
    const numeric = parseInt(code.replace(prefix, ''), 10);
    return isNaN(numeric) ? 0 : numeric;
};

// Next code for a prefix, unique across all rows (deleted ones included). Must run inside the
// insert's transaction: the prefix's code_sequences row stays locked until that transaction
// ends, so a concurrent insert for the same prefix waits and then gets the following number.
// Everything runs on the caller's connection; asking the pool for a second one while holding a
// transaction would let a burst of requests exhaust the pool and wait on each other forever.
const nextCode = async (model, column, prefix, width = 5, transaction = null) => {
    if (!transaction) {
        throw new Error(`nextCode(${prefix}) must run inside the insert's transaction`);
    }

    const lockSequence = () => db.codeSequence.findOne({ where: { prefix }, lock: transaction.LOCK.UPDATE, transaction });

    // The seeder creates every prefix's row; this only covers a database that was never seeded
    let sequence = await lockSequence();
    if (!sequence) {
        await db.sequelize.query(
            `INSERT IGNORE INTO code_sequences (prefix, last_seq, status, created_at, modified_at, deleted)
             VALUES (:prefix, 0, 'active', NOW(), NOW(), false)`,
            { replacements: { prefix }, type: QueryTypes.INSERT, transaction }
        );
        sequence = await lockSequence();
    }

    // locking read: sees rows committed after this transaction's snapshot was taken
    const last = await model.findOne({ order: [['id', 'DESC']], attributes: [column], lock: transaction.LOCK.SHARE, transaction });

    // rows inserted by seeders carry fixed codes, so the table's last code counts too
    const next = Math.max(sequence.last_seq, seqOf(last && last[column], prefix)) + 1;
    await db.codeSequence.update({ last_seq: next, modified_at: new Date() }, { where: { id: sequence.id }, transaction });

    return prefix + String(next).padStart(width, '0');
};

exports.PREFIX = PREFIX;

exports.generateUserCode = (transaction) => nextCode(db.user, 'code', PREFIX.USER, 5, transaction);
exports.generateJobCategoryCode = (transaction) => nextCode(db.jobCategory, 'code', PREFIX.JOB_CATEGORY, 5, transaction);
exports.generateInstitutionTypeCode = (transaction) => nextCode(db.institutionType, 'code', PREFIX.INSTITUTION_TYPE, 5, transaction);
exports.generateStateCode = (transaction) => nextCode(db.state, 'code', PREFIX.STATE, 5, transaction);
exports.generateCityCode = (transaction) => nextCode(db.city, 'code', PREFIX.CITY, 5, transaction);
exports.generateJobCode = (transaction) => nextCode(db.job, 'code', PREFIX.JOB, 5, transaction);
exports.generateApplicationCode = (transaction) => nextCode(db.application, 'code', PREFIX.APPLICATION, 5, transaction);
