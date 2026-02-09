const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Incident = sequelize.define('Incident', {
  incident_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '장애 고유 식별자',
  },
  log_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '연관 작업 로그 ID',
  },
  action_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '조치 유형(임시, 영구, 가이드, 모니터링)',
    validate: {
      isIn: [['임시', '영구', '가이드', '모니터링']],
    },
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '장애발생일시',
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '장애복구일시',
  },
  severity: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '영향도 (Critical, Major, Minor)',
    validate: {
      isIn: [['Critical', 'Major', 'Minor']],
    },
  },
  cause_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '장애 원인 분류(OS, DB, 앱 등)',
  },
  is_recurrence: {
    type: DataTypes.CHAR(1),
    allowNull: false,
    defaultValue: 'N',
    comment: '재발 여부 체크(Y/N)',
    validate: {
      isIn: [['Y', 'N']],
    },
  },
}, {
  tableName: 'incidents',
  timestamps: false,
});

module.exports = Incident;
