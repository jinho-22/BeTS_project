/**
 * 모델 관계(Association) 설정 및 통합 내보내기
 * 도메인 간 관계를 이 파일에서 중앙 관리합니다.
 */
const sequelize = require('../config/database');

// ─── User Domain ────────────────────────────
const User = require('../modules/user/models/User.model');
const Department = require('../modules/user/models/Department.model');

// ─── Project Domain ─────────────────────────
const Client = require('../modules/project/models/Client.model');
const Project = require('../modules/project/models/Project.model');
const ManagerContact = require('../modules/project/models/ManagerContact.model');
const Product = require('../modules/project/models/Product.model');

// ─── Work Domain ────────────────────────────
const WorkLog = require('../modules/work/models/WorkLog.model');
const Incident = require('../modules/work/models/Incident.model');
const FileUpload = require('../modules/work/models/FileUpload.model');

// ════════════════════════════════════════════
// Association 정의
// ════════════════════════════════════════════

// ── User Domain ─────────────────────────────
// Department 1:N User
Department.hasMany(User, { foreignKey: 'dept_id', as: 'users' });
User.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });

// ── Project Domain ──────────────────────────
// Client 1:N Project
Client.hasMany(Project, { foreignKey: 'client_id', as: 'projects' });
Project.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Department 1:N Project
Department.hasMany(Project, { foreignKey: 'dept_id', as: 'projects' });
Project.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });

// Project 1:N ManagerContact
Project.hasMany(ManagerContact, { foreignKey: 'project_id', as: 'contacts' });
ManagerContact.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// ── Work Domain ─────────────────────────────
// User 1:N WorkLog
User.hasMany(WorkLog, { foreignKey: 'user_id', as: 'workLogs' });
WorkLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Project 1:N WorkLog
Project.hasMany(WorkLog, { foreignKey: 'project_id', as: 'workLogs' });
WorkLog.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// ManagerContact 1:N WorkLog
ManagerContact.hasMany(WorkLog, { foreignKey: 'contact_id', as: 'workLogs' });
WorkLog.belongsTo(ManagerContact, { foreignKey: 'contact_id', as: 'contact' });

// WorkLog 1:1 Incident (장애 발생 시에만)
WorkLog.hasOne(Incident, { foreignKey: 'log_id', as: 'incident' });
Incident.belongsTo(WorkLog, { foreignKey: 'log_id', as: 'workLog' });

// WorkLog 1:N FileUpload
WorkLog.hasMany(FileUpload, { foreignKey: 'log_id', as: 'files' });
FileUpload.belongsTo(WorkLog, { foreignKey: 'log_id', as: 'workLog' });

// FileUpload N:1 User
User.hasMany(FileUpload, { foreignKey: 'user', as: 'uploadedFiles' });
FileUpload.belongsTo(User, { foreignKey: 'user', as: 'uploader' });

module.exports = {
  sequelize,
  User,
  Department,
  Client,
  Project,
  ManagerContact,
  Product,
  WorkLog,
  Incident,
  FileUpload,
};
