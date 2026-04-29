const Joi = require('joi');

const incidentSchema = Joi.object({
  action_type: Joi.string().valid('임시', '영구', '가이드', '모니터링').required(),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().required(),
  severity: Joi.string().valid('Critical', 'Major', 'Minor').required(),
  cause_type: Joi.string().max(20).required(),
  is_recurrence: Joi.string().valid('Y', 'N').default('N'),
});

const createWorkLogSchema = {
  body: Joi.object({
    project_id: Joi.number().integer().required(),
    work_start: Joi.date().iso().required(),
    work_end: Joi.date().iso().required(),
    work_type: Joi.string().valid('정기점검', '장애지원', '기술지원', '프로젝트 지원', '기타').required(),
    sub_work_type: Joi.alternatives().try(
      Joi.array().items(Joi.string().valid('정기점검', '장애지원', '기술지원', '프로젝트 지원', '기타')),
      Joi.string().allow(null, ''),
    ).optional(),
    support_type: Joi.string().max(50).required(),
    service_type: Joi.string().max(50).required(),
    product_type: Joi.string().max(50).required(),
    product_version: Joi.string().max(50).required(),
    title: Joi.string().max(200).required(),
    contact_id: Joi.number().integer().required(),
    details: Joi.string().required(),
    incident: incidentSchema.optional().allow(null),
  }),
};

const updateWorkLogSchema = {
  body: Joi.object({
    project_id: Joi.number().integer(),
    work_start: Joi.date().iso(),
    work_end: Joi.date().iso(),
    work_type: Joi.string().valid('정기점검', '장애지원', '기술지원', '프로젝트 지원', '기타'),
    sub_work_type: Joi.alternatives().try(
      Joi.array().items(Joi.string().valid('정기점검', '장애지원', '기술지원', '프로젝트 지원', '기타')),
      Joi.string().allow(null, ''),
    ).optional(),
    support_type: Joi.string().max(50),
    service_type: Joi.string().max(50),
    product_type: Joi.string().max(50),
    product_version: Joi.string().max(50),
    title: Joi.string().max(200),
    contact_id: Joi.number().integer(),
    details: Joi.string(),
    incident: incidentSchema.optional().allow(null),
  }).min(1),
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

const changeStatusSchema = {
  body: Joi.object({
    status: Joi.string().valid('등록', '관리자확인', '승인완료').required(),
    comment: Joi.string().max(1000).allow('', null),
  }),
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

const querySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    user_id: Joi.number().integer(),
    project_id: Joi.number().integer(),
    work_type: Joi.string().valid('정기점검', '장애지원', '기술지원', '프로젝트 지원', '기타'),
    status: Joi.string().valid('등록', '관리자확인', '승인완료'),
    product_type: Joi.string().max(100),
    start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
      'string.pattern.base': 'start_date는 YYYY-MM-DD 형식이어야 합니다.',
    }),
    end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
      'string.pattern.base': 'end_date는 YYYY-MM-DD 형식이어야 합니다.',
    }),
    keyword: Joi.string().max(200),
    is_recurrence: Joi.string().valid('Y', 'N'),
  }),
};

module.exports = {
  createWorkLogSchema,
  updateWorkLogSchema,
  changeStatusSchema,
  querySchema,
};
