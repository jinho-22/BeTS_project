/**
 * products 테이블 생성 스크립트 (BeTS 데이터베이스용)
 */
const { Sequelize } = require('sequelize');
const env = require('../config/env');

// BeTS 데이터베이스에 직접 연결
const sequelize = new Sequelize('BeTS', env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mariadb',
  logging: false,
});

const createProductsTable = async () => {
  try {
    console.log('🔄 BeTS 데이터베이스에 products 테이블 생성 중...');
    
    // DB 연결 확인
    await sequelize.authenticate();
    console.log('✅ BeTS 데이터베이스 연결 성공');

    // 테이블이 이미 존재하는지 확인
    const results = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'BeTS' 
      AND table_name = 'products'
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (results[0] && results[0].count > 0) {
      console.log('⚠️ products 테이블이 이미 존재합니다.');
      await sequelize.close();
      process.exit(0);
      return;
    }

    // 테이블 생성
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '제품 식별자 (PK)',
        product_type VARCHAR(50) NOT NULL COMMENT '제품 유형 (DB, OS, WEB, Network 등)',
        product_name VARCHAR(100) NOT NULL COMMENT '제품명 (Oracle, Tibero, CentOS 등)'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 정보 테이블';
    `);

    console.log('✅ products 테이블 생성 완료!');
    
    // 확인
    const verify = await sequelize.query(`
      SHOW TABLES LIKE 'products'
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (verify && verify.length > 0) {
      console.log('✅ 확인: products 테이블이 BeTS 데이터베이스에 존재합니다.');
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
};

createProductsTable();
