/**
 * work_log 테이블의 등록일자/수정일자 컬럼 확인
 */
const { Sequelize } = require('sequelize');
const env = require('../config/env');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mariadb',
  logging: false,
});

const checkWorkLogTable = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공\n');

    // work_log 테이블 구조 확인
    const columns = await sequelize.query(`
      SHOW COLUMNS FROM work_log
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📋 work_log 테이블의 컬럼 목록:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      const isTimestamp = col.Field === 'created_at' || col.Field === 'updated_at';
      const marker = isTimestamp ? ' ⏰' : '';
      console.log(`   ${col.Field.padEnd(30)} ${col.Type.padEnd(20)} ${col.Null} ${col.Key}${marker}`);
    });

    // created_at, updated_at 컬럼 존재 여부 확인
    const hasCreatedAt = columns.some(c => c.Field === 'created_at');
    const hasUpdatedAt = columns.some(c => c.Field === 'updated_at');

    console.log('\n' + '='.repeat(80));
    if (hasCreatedAt && hasUpdatedAt) {
      console.log('✅ 등록일자(created_at)와 수정일자(updated_at) 컬럼이 존재합니다.');
    } else {
      if (!hasCreatedAt) console.log('❌ created_at 컬럼이 없습니다.');
      if (!hasUpdatedAt) console.log('❌ updated_at 컬럼이 없습니다.');
    }

    // 실제 데이터 확인
    if (hasCreatedAt && hasUpdatedAt) {
      const [data] = await sequelize.query(`
        SELECT 
          log_id,
          work_type,
          status,
          created_at,
          updated_at,
          TIMESTAMPDIFF(SECOND, created_at, updated_at) as diff_seconds
        FROM work_log
        LIMIT 5
      `, { type: sequelize.QueryTypes.SELECT });

      if (data && data.length > 0) {
        console.log('\n📊 실제 데이터 샘플 (최대 5건):');
        console.log('='.repeat(80));
        data.forEach(row => {
          const diff = row.diff_seconds > 0 ? `(${row.diff_seconds}초 차이)` : '(등록 후 수정 없음)';
          console.log(`   로그 ID: ${row.log_id}`);
          console.log(`   작업유형: ${row.work_type}, 상태: ${row.status}`);
          console.log(`   등록일자: ${row.created_at}`);
          console.log(`   수정일자: ${row.updated_at} ${diff}`);
          console.log('');
        });
      } else {
        console.log('\n⚠️ work_log 테이블에 데이터가 없습니다.');
      }
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 확인 실패:', error.message);
    await sequelize.close();
    process.exit(1);
  }
};

checkWorkLogTable();
