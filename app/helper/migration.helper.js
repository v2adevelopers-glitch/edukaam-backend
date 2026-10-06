// Used by migrations only (never requires app/model). The app creates new tables through
// sync with every current column, so a migration must cope with three states: table missing
// (first deploy: sync will create it complete), column already there (fresh DB), or a real
// change to apply (existing DB).

const describeOrNull = async (queryInterface, table) => {
    try {
        return await queryInterface.describeTable(table);
    } catch (err) {
        return null;
    }
};

exports.addColumnsIfMissing = async (queryInterface, table, columns) => {
    const current = await describeOrNull(queryInterface, table);
    if (!current) return;
    for (const [name, definition] of Object.entries(columns)) {
        if (!current[name]) await queryInterface.addColumn(table, name, definition);
    }
};

exports.removeColumnsIfPresent = async (queryInterface, table, names) => {
    const current = await describeOrNull(queryInterface, table);
    if (!current) return;
    for (const name of names) {
        if (current[name]) await queryInterface.removeColumn(table, name);
    }
};

exports.addIndexIfMissing = async (queryInterface, table, fields, name) => {
    if (!await describeOrNull(queryInterface, table)) return;
    const indexes = await queryInterface.showIndex(table);
    if (!indexes.some(i => i.name === name)) await queryInterface.addIndex(table, fields, { name });
};

exports.removeIndexIfPresent = async (queryInterface, table, name) => {
    if (!await describeOrNull(queryInterface, table)) return;
    const indexes = await queryInterface.showIndex(table);
    if (indexes.some(i => i.name === name)) await queryInterface.removeIndex(table, name);
};
