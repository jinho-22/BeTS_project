const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Notification = sequelize.define('Notification', {
  notification_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '알림 받는 사용자 ID',
  },
  type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: '알림 유형 (rejected, revised, status_changed)',
  },
  log_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '관련 작업 로그 ID',
  },
  from_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '알림 발생시킨 사용자 ID',
  },
  message: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = Notification;
