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
    contract_period: Joi.string().max(100).required(),
  }),
};

const updateProjectSchema = {
  body: Joi.object({
    client_id: Joi.number().integer(),
    dept_id: Joi.number().integer(),
    project_name: Joi.string().max(100),
    contract_period: Joi.string().max(100),
  }).min(1),
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

const createContactSchema = {
  body: Joi.object({
    project_id: Joi.number().integer().required(),
    name: Joi.string().max(50).required(),
    email: Joi.string().email().max(100).required(),
    phone: Joi.string().max(20).required(),
  }),
};

const updateContactSchema = {
  body: Joi.object({
    name: Joi.string().max(50),
    email: Joi.string().email().max(100),
    phone: Joi.string().max(20),
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
