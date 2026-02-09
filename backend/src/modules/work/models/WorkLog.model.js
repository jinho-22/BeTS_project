const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const WorkLog = sequelize.define('WorkLog', {
  log_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '작업 로그 식별자',
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '담당 직원 ID',
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '프로젝트 ID',
  },
  work_start: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '작업시작일시',
  },
  work_end: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '작업종료일시',
  },
  work_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '작업 유형(정기점검, 장애지원, 기술지원 등)',
  },
  supprt_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '지원 구분 (원격, 방문, 가이드 등)',
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
  status: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: '등록',
    comment: '결재/상태 (등록, 관리자확인, 승인완료 등)',
    validate: {
      isIn: [['등록', '관리자확인', '승인완료']],
    },
  },
  contact_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '요청자 ID',
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '상세 작업 내용 및 특이사항',
  },
  incident_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '연관 장애 ID(장애 시 생성)',
  },
}, {
  tableName: 'work_log',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = WorkLog;
