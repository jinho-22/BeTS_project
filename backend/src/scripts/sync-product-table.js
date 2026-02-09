/**
 * Product 테이블을 Sequelize sync로 생성
 */
const sequelize = require('../config/database');
const Product = require('../modules/project/models/Product.model');

const syncProductTable = async () => {
  try {
    console.log('🔄 Product 테이블 동기화 중...');
    
    // DB 연결 확인
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');

    // Product 테이블만 sync
    await Product.sync({ alter: true });
    console.log('✅ products 테이블 생성/동기화 완료!');
    
    // 테이블 확인 (QueryTypes.SELECT 사용)
    const results = await sequelize.query(`
      SHOW TABLES LIKE 'products'
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (results && results.length > 0) {
      console.log('✅ products 테이블이 데이터베이스에 존재합니다.');
      console.log('📋 테이블 정보:', results);
    } else {
      console.log('⚠️ products 테이블이 여전히 없습니다.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 테이블 동기화 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

syncProductTable();
