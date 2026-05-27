const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const WorkLogEngineer = sequelize.define('WorkLogEngineer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  log_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '작업 로그 ID',
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '추가 엔지니어 ID',
  },
}, {
  tableName: 'work_log_engineers',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['log_id', 'user_id'] },
  ],
});

module.exports = WorkLogEngineer;
