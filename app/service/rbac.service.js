const db = require('../model');

const METHOD_ACCESS_FLAG = {
    GET: 'read_access',
    POST: 'write_access',
    PUT: 'update_access',
    PATCH: 'update_access',
    DELETE: 'delete_access'
};

// { mapped: false } = API not mapped to a module = allowed for every logged-in user
exports.checkApiAccess = async (role_code, api_endpoint, api_method) => {
    try {
        const mapping = await db.apiModuleMapping.findOne({
            where: { api_endpoint, api_method, status: 'active', deleted: false },
            attributes: ['id', 'module_id'],
            raw: true
        });
        if (!mapping) return { mapped: false, allowed: true, access: null };

        const access = await db.roleModuleAccessMapping.findOne({
            where: { role_code, module_id: mapping.module_id, deleted: false },
            raw: true
        });
        if (!access) return { mapped: true, allowed: false, access: null };

        const requiredFlag = METHOD_ACCESS_FLAG[api_method];
        const allowed = !!(access.full_access || (requiredFlag && access[requiredFlag]));

        return { mapped: true, allowed, access };
    } catch (err) {
        throw err;
    }
};

// Sidebar tree for a role: menus of the modules the role has menu_access to, ordered by
// ranking and nested by parent_id. A child whose parent is not visible is left out.
exports.getMenuAccess = async (role_code) => {
    try {
        const access = await db.roleModuleAccessMapping.findAll({
            where: { role_code, menu_access: true, status: 'active', deleted: false },
            attributes: ['module_id'],
            raw: true
        });
        const moduleIds = access.map(a => a.module_id);
        if (!moduleIds.length) return [];

        const menus = await db.menu.findAll({
            where: { module_id: moduleIds, status: 'active', deleted: false },
            attributes: ['id', 'parent_id', 'name', 'm_icon', 'slug', 'route_to', 'ranking'],
            order: [['ranking', 'ASC'], ['id', 'ASC']],
            raw: true
        });

        const nodes = new Map(menus.map(m => [m.id, {
            id: m.id,
            name: m.name,
            icon: m.m_icon,
            slug: m.slug,
            route_to: m.route_to,
            children: []
        }]));

        const tree = [];
        menus.forEach(m => {
            const node = nodes.get(m.id);
            if (!m.parent_id) {
                tree.push(node);
            } else if (nodes.has(m.parent_id)) {
                nodes.get(m.parent_id).children.push(node);
            }
        });

        return tree;
    } catch (err) {
        throw err;
    }
};

exports.roleExists = async (code) => {
    try {
        return !!(await db.role.findOne({ where: { code, deleted: false }, attributes: ['id'] }));
    } catch (err) {
        throw err;
    }
};
