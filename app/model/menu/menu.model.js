module.exports = (sequelize, DataTypes) => {
    const Menu = sequelize.define("menu", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        parent_id: { type: DataTypes.INTEGER, allowNull: true },
        module_id: { type: DataTypes.INTEGER, allowNull: false },
        ranking: { type: DataTypes.INTEGER, allowNull: true },
        name: { type: DataTypes.STRING(100), allowNull: false },
        m_icon: { type: DataTypes.STRING(100), allowNull: true },
        slug: { type: DataTypes.STRING(100), allowNull: false },
        route_to: { type: DataTypes.STRING(255), allowNull: true },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "menus",
        indexes: [
            { fields: ['slug'], name: 'idx_menu_slug', unique: true },
            { fields: ['parent_id'], name: 'idx_menu_parent' },
            { fields: ['module_id'], name: 'idx_menu_module' }
        ]
    });

    return Menu;
};
