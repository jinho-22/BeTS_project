const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const WorkLogProduct = sequelize.define('WorkLogProduct', {
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
  service_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '서비스 유형 (DB, WEB/WAS 등)',
  },
  product_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '제품명(Oracle, Tibero, Jeus 등)',
  },
  product_version: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '제품 버전 정보',
  },
}, {
  tableName: 'work_log_products',
  timestamps: false,
});

module.exports = WorkLogProduct;
