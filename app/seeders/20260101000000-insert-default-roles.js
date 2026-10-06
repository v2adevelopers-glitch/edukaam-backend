'use strict';

const roles = [
  { code: 1001, role_type: 'Admin' },
  { code: 1002, role_type: 'Job Provider' },
  { code: 1003, role_type: 'Job Seeker' }
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
