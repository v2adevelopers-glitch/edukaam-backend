'use strict';

const { addColumnsIfMissing, removeColumnsIfPresent } = require('../helper/migration.helper');

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnsIfMissing(queryInterface, 'applications', {
      cover_note: { type: Sequelize.TEXT, allowNull: true, after: 'status_changed_at' },
      provider_notes: { type: Sequelize.TEXT, allowNull: true, after: 'cover_note' },
      interview_at: { type: Sequelize.DATE, allowNull: true, after: 'provider_notes' },
      interview_mode: { type: Sequelize.ENUM('in_person', 'phone', 'video'), allowNull: true, after: 'interview_at' },
      interview_location: { type: Sequelize.STRING(500), allowNull: true, after: 'interview_mode' },
      interview_notes: { type: Sequelize.TEXT, allowNull: true, after: 'interview_location' }
    });
  },

  async down(queryInterface) {
    await removeColumnsIfPresent(queryInterface, 'applications',
      ['interview_notes', 'interview_location', 'interview_mode', 'interview_at', 'provider_notes', 'cover_note']);
  }
};
