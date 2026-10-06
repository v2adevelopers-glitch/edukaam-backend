module.exports = (sequelize, DataTypes) => {
    const City = sequelize.define("city", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        code: { type: DataTypes.STRING(20), allowNull: false },
        name: { type: DataTypes.STRING(100), allowNull: false },
        state_code: { type: DataTypes.STRING(20), allowNull: false },   // FK: association in model/index.js
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "cities",
        indexes: [
            { fields: ['code'], name: 'idx_city_code', unique: true },
            // a city name is unique within its state (Udaipur exists in Rajasthan and Tripura)
            { fields: ['state_code', 'name'], name: 'idx_city_state_name', unique: true },
            { fields: ['status'], name: 'idx_city_status' }
        ]
    });

    return City;
};
