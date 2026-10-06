'use strict';

const { addColumnsIfMissing, removeColumnsIfPresent, addIndexIfMissing, removeIndexIfPresent } = require('../helper/migration.helper');

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnsIfMissing(queryInterface, 'seeker_profiles', {
      resume_file: { type: Sequelize.STRING(255), allowNull: true, after: 'about' },
      resume_name: { type: Sequelize.STRING(255), allowNull: true, after: 'resume_file' },
      resume_uploaded_at: { type: Sequelize.DATE, allowNull: true, after: 'resume_name' },
      is_discoverable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'resume_uploaded_at' },
      share_contact: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, after: 'is_discoverable' }
    });
    await addIndexIfMissing(queryInterface, 'seeker_profiles', ['is_discoverable'], 'idx_seeker_profile_is_discoverable');
  },

  async down(queryInterface) {
    await removeIndexIfPresent(queryInterface, 'seeker_profiles', 'idx_seeker_profile_is_discoverable');
    await removeColumnsIfPresent(queryInterface, 'seeker_profiles', ['share_contact', 'is_discoverable', 'resume_uploaded_at', 'resume_name', 'resume_file']);
  }
};
