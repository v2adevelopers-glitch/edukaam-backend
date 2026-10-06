'use strict';

const bcrypt = require('bcrypt');

const admin = { code: 'EDJUSR00001', role_code: 1001, name: 'Admin', email: 'admin@example.com', phone: '9999999999' };

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!process.env.SEED_ADMIN_PASSWORD) throw new Error('Set SEED_ADMIN_PASSWORD in .env first');

    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE code = :code OR email = :email OR phone = :phone`,
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
