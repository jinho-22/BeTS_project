/**
 * 두 데이터베이스(bets_worklog, BeTS)의 테이블과 데이터 확인
 */
const { Sequelize } = require('sequelize');
const env = require('../config/env');

const checkDatabase = async (dbName) => {
  const sequelize = new Sequelize(dbName, env.db.user, env.db.password, {
    host: env.db.host,
    port: env.db.port,
    dialect: 'mariadb',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log(`\n✅ ${dbName} 데이터베이스 연결 성공`);

    // 테이블 목록 조회
    const tables = await sequelize.query(`
      SHOW TABLES
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`\n📋 ${dbName} 데이터베이스의 테이블 목록:`);
    const tableNames = [];
    tables.forEach(t => {
      const key = Object.keys(t)[0];
      const tableName = t[key];
      tableNames.push(tableName);
      console.log(`   - ${tableName}`);
    });

    // 각 테이블의 데이터 개수 확인
    console.log(`\n📊 ${dbName} 데이터베이스의 데이터 개수:`);
    for (const tableName of tableNames) {
      try {
        const [count] = await sequelize.query(`
          SELECT COUNT(*) as cnt FROM \`${tableName}\`
        `, { type: sequelize.QueryTypes.SELECT });
        console.log(`   - ${tableName}: ${count.cnt}건`);
      } catch (err) {
        // 일부 테이블은 조회 실패할 수 있음
      }
    }

    await sequelize.close();
    return { dbName, tables: tableNames, tableCount: tableNames.length };
  } catch (error) {
    console.error(`❌ ${dbName} 데이터베이스 확인 실패:`, error.message);
    await sequelize.close();
    return null;
  }
};

const main = async () => {
  console.log('🔍 데이터베이스 확인 중...\n');
  console.log('='.repeat(60));

  const results = [];
  
  // bets_worklog 확인
  const result1 = await checkDatabase('bets_worklog');
  if (result1) results.push(result1);

  // BeTS 확인
  const result2 = await checkDatabase('BeTS');
  if (result2) results.push(result2);

  console.log('\n' + '='.repeat(60));
  console.log('\n📌 요약:');
  results.forEach(r => {
    console.log(`   ${r.dbName}: ${r.tableCount}개 테이블`);
  });

  // 환경 변수 확인
  console.log(`\n⚙️  환경 변수 설정: DB_NAME=${env.db.name}`);
  
  if (env.db.name === 'bets_worklog') {
    console.log('   → 백엔드는 bets_worklog 데이터베이스를 사용하도록 설정되어 있습니다.');
  } else {
    console.log(`   → 백엔드는 ${env.db.name} 데이터베이스를 사용하도록 설정되어 있습니다.`);
  }

  process.exit(0);
};

main();
