'use strict';

const { modules, menus, role_access, api_mappings } = require('../data/rbac.json');

const ACCESS_FLAGS = ['menu_access', 'read_access', 'write_access', 'update_access', 'delete_access', 'full_access'];
// same defaults as the model: menu/read on, everything else off unless the data says so
const FLAG_DEFAULTS = { menu_access: true, read_access: true, write_access: false, update_access: false, delete_access: false, full_access: false };

const audit = (now) => ({ status: 'active', created_at: now, modified_at: now, deleted: false });

// Everything is referenced by slug / role code / endpoint, never by id
module.exports = {
  async up(queryInterface, Sequelize) {
    const { QueryTypes } = Sequelize;
    const now = new Date();
    const select = (sql, replacements = {}) => queryInterface.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

    // modules
    const existingModules = new Set((await select(`SELECT slug FROM modules`)).map(r => r.slug));
    const moduleRows = modules.filter(m => !existingModules.has(m.slug)).map(m => ({ name: m.name, slug: m.slug, ...audit(now) }));
    if (moduleRows.length) await queryInterface.bulkInsert('modules', moduleRows);

    const moduleIds = new Map((await select(`SELECT id, slug FROM modules WHERE slug IN (:slugs)`, { slugs: modules.map(m => m.slug) }))
      .map(r => [r.slug, r.id]));

    // menus: parents first, so children can look up parent_id by slug
    const insertMenus = async (list) => {
      const existingMenus = new Map((await select(`SELECT id, slug FROM menus`)).map(r => [r.slug, r.id]));
      const rows = list.filter(m => !existingMenus.has(m.slug)).map(m => ({
        parent_id: m.parent ? existingMenus.get(m.parent) : null,
        module_id: moduleIds.get(m.module),
        ranking: m.ranking,
        name: m.name,
        m_icon: m.icon,
        slug: m.slug,
        route_to: m.route_to,
        ...audit(now)
      }));
      if (rows.length) await queryInterface.bulkInsert('menus', rows);
    };
    await insertMenus(menus.filter(m => !m.parent));
    await insertMenus(menus.filter(m => m.parent));

    // role access
    const accessRowsInDb = await select(`SELECT id, role_code, module_id, ${ACCESS_FLAGS.join(', ')} FROM role_module_access_mapping`);
    const existingAccess = new Set(accessRowsInDb.map(r => `${r.role_code}:${r.module_id}`));

    // a permission added to rbac.json later is granted on existing rows too (never revoked here)
    for (const a of role_access) {
      const row = accessRowsInDb.find(r => r.role_code === a.role_code && r.module_id === moduleIds.get(a.module));
      if (!row) continue;
      const grants = ACCESS_FLAGS.filter(flag => a[flag] === true && !row[flag]);
      if (grants.length) {
        await queryInterface.bulkUpdate('role_module_access_mapping',
          Object.fromEntries(grants.map(flag => [flag, true])), { id: row.id });
      }
    }
    const accessRows = role_access
      .filter(a => !existingAccess.has(`${a.role_code}:${moduleIds.get(a.module)}`))
      .map(a => {
        const row = { role_code: a.role_code, module_id: moduleIds.get(a.module), ...audit(now) };
        ACCESS_FLAGS.forEach(flag => { row[flag] = a[flag] !== undefined ? a[flag] : FLAG_DEFAULTS[flag]; });
        return row;
      });
    if (accessRows.length) await queryInterface.bulkInsert('role_module_access_mapping', accessRows);

    // API -> module mapping (route patterns, as checkApiModuleAccess builds them)
    const existingApis = new Set((await select(`SELECT api_endpoint, api_method FROM api_module_mapping`))
      .map(r => `${r.api_method} ${r.api_endpoint}`));
    const apiRows = api_mappings
      .filter(a => !existingApis.has(`${a.api_method} ${a.api_endpoint}`))
      .map(a => ({
        module_id: moduleIds.get(a.module),
        api_endpoint: a.api_endpoint,
        api_method: a.api_method,
        api_slug: a.api_slug,
        ...audit(now)
      }));
    if (apiRows.length) await queryInterface.bulkInsert('api_module_mapping', apiRows);
  },

  async down(queryInterface, Sequelize) {
    const { QueryTypes } = Sequelize;
    const query = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements, type: QueryTypes.DELETE });

    for (const a of api_mappings) {
      await query(`DELETE FROM api_module_mapping WHERE api_endpoint = :api_endpoint AND api_method = :api_method`, a);
    }
    for (const a of role_access) {
      await query(`DELETE FROM role_module_access_mapping WHERE role_code = :role_code
        AND module_id = (SELECT id FROM modules WHERE slug = :module)`, a);
    }
    await queryInterface.bulkDelete('menus', { slug: menus.filter(m => m.parent).map(m => m.slug) });
    await queryInterface.bulkDelete('menus', { slug: menus.filter(m => !m.parent).map(m => m.slug) });
    await queryInterface.bulkDelete('modules', { slug: modules.map(m => m.slug) });
  }
};
