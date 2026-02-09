const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Department = sequelize.define('Department', {
  dept_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '부서 고유 식별자',
  },
  dept_name: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: '부서 명칭',
  },
}, {
  tableName: 'departments',
  timestamps: false,
});

module.exports = Department;
