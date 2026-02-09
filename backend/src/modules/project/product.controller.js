const productService = require('./product.service');
const { sendSuccess, sendCreated } = require('../../shared/utils/response');

class ProductController {
  async getAll(req, res, next) {
    try {
      const result = await productService.findAll();
      sendSuccess(res, result, '제품 목록 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async getGrouped(req, res, next) {
    try {
      const result = await productService.findGroupedByType();
      sendSuccess(res, result, '제품 그룹 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.findById(req.params.id);
      sendSuccess(res, product, '제품 조회 성공');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const product = await productService.create(req.body);
      sendCreated(res, product, '제품 생성 완료');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const product = await productService.update(parseInt(req.params.id), req.body);
      sendSuccess(res, product, '제품 수정 완료');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await productService.delete(parseInt(req.params.id));
      sendSuccess(res, null, '제품 삭제 완료');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
