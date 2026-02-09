const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const FileUpload = sequelize.define('FileUpload', {
  file_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '파일 식별자',
  },
  log_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '작업 로그 ID',
  },
  user: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '업로드한 사용자 ID',
  },
  original_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '파일 원본 파일명',
  },
  stored_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '저장된 파일명',
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '파일 저장 경로',
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '파일 크기(bytes)',
  },
}, {
  tableName: 'file_uploads',
  timestamps: false,
});

module.exports = FileUpload;
