/**
 * products 테이블 생성 스크립트
 * Product 모델이 정의되어 있지만 테이블이 생성되지 않은 경우 실행
 */
const sequelize = require('../config/database');
const Product = require('../modules/project/models/Product.model');

const createProductsTable = async () => {
  try {
    console.log('🔄 products 테이블 생성 중...');
    
    // 테이블이 이미 존재하는지 확인
    const results = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'products'
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (results[0] && results[0].count > 0) {
      console.log('⚠️ products 테이블이 이미 존재합니다.');
      return;
    }

    // 테이블 생성 (CREATE TABLE은 SELECT 타입이 아님)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '제품 식별자 (PK)',
        product_type VARCHAR(50) NOT NULL COMMENT '제품 유형 (DB, OS, WEB, Network 등)',
        product_name VARCHAR(100) NOT NULL COMMENT '제품명 (Oracle, Tibero, CentOS 등)'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 정보 테이블';
    `);

    console.log('✅ products 테이블 생성 완료!');
    
    // 또는 Sequelize sync 사용
    // await Product.sync({ force: false });
    // console.log('✅ Sequelize sync로 products 테이블 생성 완료!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error.message);
    process.exit(1);
  }
};

createProductsTable();
