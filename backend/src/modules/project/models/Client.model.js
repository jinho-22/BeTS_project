const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Client = sequelize.define('Client', {
  client_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '고객사 고유 식별자',
  },
  client_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '고객사 명칭',
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '논리적 삭제 여부',
  },
}, {
  tableName: 'client',
  timestamps: false,
});

module.exports = Client;
