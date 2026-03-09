const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Project = sequelize.define('Project', {
  project_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '프로젝트 고유 식별자',
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '고객사 ID',
  },
  dept_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '담당 부서 ID',
  },
  project_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '프로젝트 명칭',
  },
  contract_start: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '계약 시작일',
  },
  contract_end: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '계약 종료일',
  },
  acs_contract_time: {
    type: DataTypes.DECIMAL(10, 1),
    allowNull: true,
    defaultValue: null,
    comment: 'ACS 계약 시간(시간 단위)',
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '논리적 삭제 여부',
  },
}, {
  tableName: 'projects',
  timestamps: false,
});

module.exports = Project;
