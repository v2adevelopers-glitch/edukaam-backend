module.exports = (sequelize, DataTypes) => {
    const State = sequelize.define("state", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        code: { type: DataTypes.STRING(20), allowNull: false },
        name: { type: DataTypes.STRING(100), allowNull: false },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "states",
        indexes: [
            { fields: ['code'], name: 'idx_state_code', unique: true },
            { fields: ['name'], name: 'idx_state_name', unique: true },
            { fields: ['status'], name: 'idx_state_status' }
        ]
    });

    return State;
};
