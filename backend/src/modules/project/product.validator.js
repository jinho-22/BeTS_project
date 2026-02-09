const Joi = require('joi');

const createProductSchema = {
  body: Joi.object({
    product_type: Joi.string().max(50).required().messages({
      'any.required': '제품 유형은 필수 항목입니다.',
    }),
    product_name: Joi.string().max(100).required().messages({
      'any.required': '제품명은 필수 항목입니다.',
    }),
  }),
};

const updateProductSchema = {
  body: Joi.object({
    product_type: Joi.string().max(50),
    product_name: Joi.string().max(100),
  }).min(1),
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

module.exports = {
  createProductSchema,
  updateProductSchema,
};
