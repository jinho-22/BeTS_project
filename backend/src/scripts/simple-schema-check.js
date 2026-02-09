/**
 * 간단한 스키마 비교
 */
const { Sequelize } = require('sequelize');
const env = require('../config/env');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mariadb',
  logging: false,
});

const checkTable = async (tableName) => {
  const columns = await sequelize.query(`
    SHOW COLUMNS FROM \`${tableName}\`
  `, { type: sequelize.QueryTypes.SELECT });
  return columns;
};

const main = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공\n');
    console.log('='.repeat(80));
    console.log('📋 요청된 DDL vs 실제 데이터베이스 구조 차이점\n');
    console.log('='.repeat(80));

    const differences = [];

    // 1. incidents 테이블 확인
    console.log('\n1️⃣ incidents 테이블:');
    const incidentCols = await checkTable('incidents');
    const incidentIdCol = incidentCols.find(c => c.Field === 'incident_id');
    if (incidentIdCol && incidentIdCol.Extra.includes('auto_increment')) {
      console.log('   ❌ 차이점: incident_id가 AUTO_INCREMENT로 설정됨');
      console.log('      요청: AUTO_INCREMENT 없음');
      console.log('      실제: AUTO_INCREMENT 있음');
      differences.push('incidents.incident_id: AUTO_INCREMENT 추가됨');
    } else {
      console.log('   ✅ incident_id: AUTO_INCREMENT 없음 (요청과 일치)');
    }

    // 2. work_log 테이블 확인
    console.log('\n2️⃣ work_log 테이블:');
    const workLogCols = await checkTable('work_log');
    const hasCreatedAt = workLogCols.some(c => c.Field === 'created_at');
    const hasUpdatedAt = workLogCols.some(c => c.Field === 'updated_at');
    if (hasCreatedAt || hasUpdatedAt) {
      console.log('   ❌ 차이점: timestamps 컬럼이 추가됨');
      if (hasCreatedAt) {
        console.log('      - created_at 컬럼 추가됨 (요청에는 없음)');
        differences.push('work_log.created_at: 컬럼 추가됨 (Sequelize timestamps)');
      }
      if (hasUpdatedAt) {
        console.log('      - updated_at 컬럼 추가됨 (요청에는 없음)');
        differences.push('work_log.updated_at: 컬럼 추가됨 (Sequelize timestamps)');
      }
    } else {
      console.log('   ✅ timestamps 컬럼 없음 (요청과 일치)');
    }

    // 3. users 테이블 확인
    console.log('\n3️⃣ users 테이블:');
    const userCols = await checkTable('users');
    const isActiveCol = userCols.find(c => c.Field === 'is_active');
    if (isActiveCol) {
      if (isActiveCol.Type.includes('tinyint')) {
        console.log('   ⚠️  참고: is_active가 TINYINT(1)로 저장됨');
        console.log('      (MariaDB에서 BOOLEAN은 TINYINT(1)로 표현됨 - 정상)');
      }
    }

    // 4. 다른 테이블들 timestamps 확인
    console.log('\n4️⃣ 다른 테이블들 timestamps 확인:');
    const otherTables = ['client', 'departments', 'projects', 'manager_contacts', 'file_uploads', 'users'];
    for (const table of otherTables) {
      const cols = await checkTable(table);
      const hasCreatedAt = cols.some(c => c.Field === 'created_at');
      const hasUpdatedAt = cols.some(c => c.Field === 'updated_at');
      if (hasCreatedAt || hasUpdatedAt) {
        console.log(`   ⚠️  ${table}: timestamps 컬럼이 있음 (요청에는 없음)`);
        if (hasCreatedAt) differences.push(`${table}.created_at: 컬럼 추가됨`);
        if (hasUpdatedAt) differences.push(`${table}.updated_at: 컬럼 추가됨`);
      }
    }

    // 요약
    console.log('\n' + '='.repeat(80));
    console.log('📌 차이점 요약:');
    console.log('='.repeat(80));
    
    if (differences.length === 0) {
      console.log('✅ 요청된 DDL과 실제 구조가 완전히 일치합니다.');
    } else {
      differences.forEach((diff, idx) => {
        console.log(`${idx + 1}. ${diff}`);
      });
    }

    console.log('\n📝 참고사항:');
    console.log('- MariaDB에서 BOOLEAN은 TINYINT(1)로 저장됩니다 (정상)');
    console.log('- Sequelize의 timestamps 옵션으로 인해 일부 테이블에 created_at/updated_at이 추가되었을 수 있습니다');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 확인 실패:', error.message);
    await sequelize.close();
    process.exit(1);
  }
};

main();
