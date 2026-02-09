const Joi = require('joi');

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': '유효한 이메일 형식이 아닙니다.',
      'any.required': '이메일은 필수 항목입니다.',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': '비밀번호는 최소 6자 이상이어야 합니다.',
      'any.required': '비밀번호는 필수 항목입니다.',
    }),
  }),
};

const refreshSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': '리프레시 토큰은 필수 항목입니다.',
    }),
  }),
};

const createUserSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().max(50).required(),
    password: Joi.string().min(6).required(),
    dept_id: Joi.number().integer().required(),
    position: Joi.string().max(20).required(),
    role: Joi.string().valid('admin', 'manager', 'engineer').default('engineer'),
    is_active: Joi.boolean().default(true),
  }),
};

const updateUserSchema = {
  body: Joi.object({
    name: Joi.string().max(50),
    dept_id: Joi.number().integer(),
    position: Joi.string().max(20),
    role: Joi.string().valid('admin', 'manager', 'engineer'),
    password: Joi.string().min(6),
  }).min(1),
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

const createDepartmentSchema = {
  body: Joi.object({
    dept_name: Joi.string().max(30).required().messages({
      'any.required': '부서 명칭은 필수 항목입니다.',
    }),
  }),
};

const updateDepartmentSchema = {
  body: Joi.object({
    dept_name: Joi.string().max(30).required().messages({
      'any.required': '부서 명칭은 필수 항목입니다.',
    }),
  }),
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

module.exports = {
  loginSchema,
  refreshSchema,
  createUserSchema,
  updateUserSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
};
