'use strict';

const rows = require('../data/institution_types.json');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // code and name are both unique; skip rows that already exist so the seeder can be re-run
    const existing = await queryInterface.sequelize.query(`SELECT code, name FROM institution_types`, { type: Sequelize.QueryTypes.SELECT });
    const existingCodes = new Set(existing.map(r => r.code));
    const existingNames = new Set(existing.map(r => r.name));

    const toInsert = rows
      .filter(r => !existingCodes.has(r.code) && !existingNames.has(r.name))
      .map(r => ({ code: r.code, name: r.name, status: 'active', created_at: now, modified_at: now, deleted: false }));

    if (toInsert.length) await queryInterface.bulkInsert('institution_types', toInsert);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('institution_types', { code: rows.map(r => r.code) });
  }
};
