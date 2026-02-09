const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '사용자 고유 식별자',
  },
  dept_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '소속 부서 ID(FK)',
  },
  email: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '회사 이메일 주소(로그인시 사용)',
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '성명',
  },
  position: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '직급 (전임, 선임 등)',
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '암호화된 비밀번호',
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'engineer',
    comment: '권한(admin, manager, engineer)',
    validate: {
      isIn: [['admin', 'manager', 'engineer']],
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '계정 활성화/퇴사 여부',
  },
}, {
  tableName: 'users',
  timestamps: false,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

// 인스턴스 메서드: 비밀번호 검증
User.prototype.validatePassword = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

// JSON 변환 시 비밀번호 제거
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
