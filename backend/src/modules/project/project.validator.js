const Joi = require('joi');

const createClientSchema = {
  body: Joi.object({
    client_name: Joi.string().max(100).required().messages({
      'any.required': '고객사 명칭은 필수 항목입니다.',
    }),
  }),
};

const updateClientSchema = {
  body: Joi.object({
    client_name: Joi.string().max(100),
  }).min(1),
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

const createProjectSchema = {
  body: Joi.object({
    client_id: Joi.number().integer().required(),
    dept_id: Joi.number().integer().required(),
    project_name: Joi.string().max(100).required(),
    contract_start: Joi.date().required().messages({
      'any.required': '계약 시작일은 필수입니다.',
    }),
    contract_end: Joi.date().required().messages({
      'any.required': '계약 종료일은 필수입니다.',
    }),
    acs_contract_time: Joi.number().precision(1).min(0).allow(null).optional(),
  }),
};

const updateProjectSchema = {
  body: Joi.object({
    client_id: Joi.number().integer(),
    dept_id: Joi.number().integer(),
    project_name: Joi.string().max(100),
    contract_start: Joi.date(),
    contract_end: Joi.date(),
    acs_contract_time: Joi.number().precision(1).min(0).allow(null),
  }).min(1),
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

const createContactSchema = {
  body: Joi.object({
    project_id: Joi.number().integer().required(),
    name: Joi.string().max(50).required(),
    company: Joi.string().max(100).allow('', null).default(''),
    email: Joi.string().email().max(100).allow('', null).default(''),
    phone: Joi.string().max(20).allow('', null).default(''),
  }),
};

const updateContactSchema = {
  body: Joi.object({
    name: Joi.string().max(50),
    company: Joi.string().max(100).allow('', null),
    email: Joi.string().email().max(100).allow('', null),
    phone: Joi.string().max(20).allow('', null),
  }).min(1),
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

module.exports = {
  createClientSchema,
  updateClientSchema,
  createProjectSchema,
  updateProjectSchema,
  createContactSchema,
  updateContactSchema,
};
