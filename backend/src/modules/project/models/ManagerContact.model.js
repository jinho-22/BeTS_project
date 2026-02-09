const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ManagerContact = sequelize.define('ManagerContact', {
  contact_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '고객사 담당자 고유 식별자',
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '소속 프로젝트 ID',
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '요청자 성명',
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '요청자 이메일 주소',
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '요청자 연락처',
  },
}, {
  tableName: 'manager_contacts',
  timestamps: false,
});

module.exports = ManagerContact;
