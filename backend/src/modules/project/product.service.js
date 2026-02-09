const AppError = require('../../shared/utils/AppError');
const { Product } = require('../../models');

class ProductService {
  /**
   * 전체 제품 목록 조회
   */
  async findAll() {
    return Product.findAll({
      order: [['product_type', 'ASC'], ['product_name', 'ASC']],
    });
  }

  /**
   * 제품 유형별 그룹핑 조회
   */
  async findGroupedByType() {
    const products = await Product.findAll({
      order: [['product_type', 'ASC'], ['product_name', 'ASC']],
    });

    // product_type으로 그룹핑
    const grouped = {};
    products.forEach((p) => {
      const type = p.product_type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(p);
    });

    return { products, grouped };
  }

  /**
   * 제품 단건 조회
   */
  async findById(productId) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new AppError('제품을 찾을 수 없습니다.', 404);
    }
    return product;
  }

  /**
   * 제품 생성
   */
  async create(data) {
    // 중복 체크 (같은 유형 + 같은 이름)
    const existing = await Product.findOne({
      where: { product_type: data.product_type, product_name: data.product_name },
    });
    if (existing) {
      throw new AppError('이미 동일한 제품 유형/제품명이 존재합니다.', 409);
    }
    return Product.create(data);
  }

  /**
   * 제품 수정
   */
  async update(productId, data) {
    const product = await this.findById(productId);

    // 중복 체크
    if (data.product_type || data.product_name) {
      const checkType = data.product_type || product.product_type;
      const checkName = data.product_name || product.product_name;
      const existing = await Product.findOne({
        where: { product_type: checkType, product_name: checkName },
      });
      if (existing && existing.product_id !== productId) {
        throw new AppError('이미 동일한 제품 유형/제품명이 존재합니다.', 409);
      }
    }

    return product.update(data);
  }

  /**
   * 제품 삭제
   */
  async delete(productId) {
    const product = await this.findById(productId);
    return product.destroy();
  }
}

module.exports = new ProductService();
