'use strict';

// One code_sequences row per business-code prefix (see app/helper/code_generator.helper.js).
// last_seq starts at 0: the generator also looks at each table's last code, so existing and
// seeded rows are never handed out again.
const prefixes = ['EDJUSR', 'EDJCAT', 'EDJITY', 'EDJSTA', 'EDJCTY', 'EDJJOB', 'EDJAPP'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const existing = await queryInterface.sequelize.query(`SELECT prefix FROM code_sequences`, { type: Sequelize.QueryTypes.SELECT });
    const existingPrefixes = new Set(existing.map(r => r.prefix));

    const rows = prefixes
      .filter(prefix => !existingPrefixes.has(prefix))
      .map(prefix => ({ prefix, last_seq: 0, status: 'active', created_at: now, modified_at: now, deleted: false }));

    if (rows.length) await queryInterface.bulkInsert('code_sequences', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('code_sequences', { prefix: prefixes });
  }
};
