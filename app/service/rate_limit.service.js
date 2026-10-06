const { QueryTypes } = require('sequelize');
const db = require('../model');

const DEADLOCK = 'ER_LOCK_DEADLOCK';

const toInfo = (row) => (row ? { totalHits: row.hits, resetTime: row.reset_at } : undefined);

// One hit for a key; starts a new window when the old one has ended. Raw SQL because the
// counter must be created-or-incremented atomically: a read-then-write through the model would
// let two first hits from the same client both try to create the row.
exports.hit = async (rl_key, windowMs, attempt = 1) => {
    const t = await db.sequelize.transaction();
    try {
        // in ON DUPLICATE KEY UPDATE the assignments run left to right, so both IFs still compare
        // against the old reset_at
        await db.sequelize.query(
            `INSERT INTO rate_limit_hits (rl_key, hits, reset_at, status, created_at, modified_at, deleted)
             VALUES (:rl_key, 1, NOW(3) + INTERVAL (:windowMs * 1000) MICROSECOND, 'active', NOW(), NOW(), false)
             ON DUPLICATE KEY UPDATE
                 hits = IF(reset_at <= NOW(3), 1, hits + 1),
                 reset_at = IF(reset_at <= NOW(3), NOW(3) + INTERVAL (:windowMs * 1000) MICROSECOND, reset_at),
                 modified_at = NOW()`,
            { replacements: { rl_key, windowMs }, type: QueryTypes.INSERT, transaction: t }
        );
        const row = await db.rateLimitHit.findOne({ where: { rl_key }, attributes: ['hits', 'reset_at'], transaction: t });
        await t.commit();
        return toInfo(row);
    } catch (err) {
        await t.rollback();
        // concurrent first inserts of the same key can deadlock in InnoDB; the retry finds the row
        if (attempt < 3 && err.parent && err.parent.code === DEADLOCK) return exports.hit(rl_key, windowMs, attempt + 1);
        throw err;
    }
};

exports.getHits = async (rl_key) => {
    try {
        const row = await db.rateLimitHit.findOne({
            where: { rl_key, reset_at: { [db.Sequelize.Op.gt]: db.sequelize.fn('NOW', 3) } },
            attributes: ['hits', 'reset_at']
        });
        return toInfo(row);
    } catch (err) {
        throw err;
    }
};

exports.removeHit = async (rl_key) => {
    try {
        await db.rateLimitHit.update({
            hits: db.sequelize.literal('GREATEST(hits - 1, 0)'),
            modified_at: new Date()
        }, { where: { rl_key } });
    } catch (err) {
        throw err;
    }
};

// Counters are throwaway (not business records), so these two delete rows outright
exports.resetHits = async (rl_key) => {
    try {
        await db.rateLimitHit.destroy({ where: { rl_key } });
    } catch (err) {
        throw err;
    }
};

exports.purgeExpiredHits = async () => {
    try {
        const purged = await db.rateLimitHit.destroy({
            where: { reset_at: { [db.Sequelize.Op.lt]: db.sequelize.fn('NOW', 3) } }
        });
        return { purged };
    } catch (err) {
        throw err;
    }
};
