const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const WorkLogComment = sequelize.define('WorkLogComment', {
  comment_id: {
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
    comment: '작성자(상태 변경자) ID',
  },
  action_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '액션 유형 (관리자확인, 승인완료, 반려)',
    validate: {
      isIn: [['관리자확인', '승인완료', '반려']],
    },
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '코멘트 (반려 시 필수)',
  },
}, {
  tableName: 'work_log_comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = WorkLogComment;
