const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Product = sequelize.define('Product', {
  product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '제품 식별자 (PK)',
  },
  product_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '제품 유형 (DB, OS, WEB, Network 등)',
  },
  product_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '제품명 (Oracle, Tibero, CentOS 등)',
  },
}, {
  tableName: 'products',
  timestamps: false,
});

module.exports = Product;
