module.exports = (sequelize, DataTypes) => {
    // One row per business-code prefix. Locking the row serialises code generation for that
    // prefix; last_seq is the highest sequence number handed out so far.
    const CodeSequence = sequelize.define("code_sequence", {
        id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
        prefix: { type: DataTypes.STRING(20), allowNull: false },
        last_seq: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        modified_by: { type: DataTypes.INTEGER, allowNull: true },
        ip_address: { type: DataTypes.STRING(45), allowNull: true },
        deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        timestamps: false,
        tableName: "code_sequences",
        indexes: [
            { fields: ['prefix'], name: 'idx_code_sequence_prefix', unique: true }
        ]
    });

    return CodeSequence;
};
