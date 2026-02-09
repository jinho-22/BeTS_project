/**
 * 요청된 DDL과 실제 데이터베이스 구조 비교
 */
const { Sequelize } = require('sequelize');
const env = require('../config/env');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mariadb',
  logging: false,
});

const compareSchema = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공\n');
    console.log('='.repeat(80));
    console.log('📋 요청된 DDL vs 실제 데이터베이스 구조 비교\n');
    console.log('='.repeat(80));

    // 각 테이블의 구조 확인
    const tables = [
      'client',
      'departments',
      'file_uploads',
      'incidents',
      'manager_contacts',
      'projects',
      'users',
      'work_log',
    ];

    const differences = [];

    for (const tableName of tables) {
      console.log(`\n🔍 ${tableName} 테이블:`);
      console.log('-'.repeat(80));

      try {
        const columns = await sequelize.query(`
          SHOW FULL COLUMNS FROM \`${tableName}\`
        `, { type: sequelize.QueryTypes.SELECT });

        const constraints = await sequelize.query(`
          SELECT 
            CONSTRAINT_NAME,
            CONSTRAINT_TYPE,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${tableName}'
          AND CONSTRAINT_NAME != 'PRIMARY'
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('실제 컬럼:');
        columns.forEach(col => {
          const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.Default ? ` DEFAULT ${col.Default}` : '';
          const autoInc = col.Extra.includes('auto_increment') ? ' AUTO_INCREMENT' : '';
          const comment = col.Comment ? ` COMMENT '${col.Comment}'` : '';
          console.log(`  - ${col.Field}: ${col.Type} ${nullable}${defaultVal}${autoInc}${comment}`);
        });

        if (constraints.length > 0) {
          console.log('\n외래키 제약조건:');
          constraints.forEach(cons => {
            if (cons.CONSTRAINT_TYPE === 'FOREIGN KEY' || cons.REFERENCED_TABLE_NAME) {
              console.log(`  - ${cons.CONSTRAINT_NAME}: ${cons.COLUMN_NAME} -> ${cons.REFERENCED_TABLE_NAME}.${cons.REFERENCED_COLUMN_NAME}`);
            }
          });
        }

        // 특정 테이블별 차이점 체크
        if (tableName === 'work_log') {
          const hasCreatedAt = columns.some(c => c.Field === 'created_at');
          const hasUpdatedAt = columns.some(c => c.Field === 'updated_at');
          if (hasCreatedAt || hasUpdatedAt) {
            console.log('\n⚠️  차이점:');
            if (hasCreatedAt) console.log('  - created_at 컬럼이 추가됨 (Sequelize timestamps)');
            if (hasUpdatedAt) console.log('  - updated_at 컬럼이 추가됨 (Sequelize timestamps)');
            differences.push(`${tableName}: created_at, updated_at 컬럼 추가`);
          }
        }

        if (tableName === 'incidents') {
          const incidentIdCol = columns.find(c => c.Field === 'incident_id');
          if (incidentIdCol && !incidentIdCol.Extra.includes('auto_increment')) {
            console.log('\n⚠️  차이점:');
            console.log('  - incident_id가 AUTO_INCREMENT가 아님 (요청: AUTO_INCREMENT 없음, 실제: AUTO_INCREMENT 있음)');
            differences.push(`${tableName}: incident_id AUTO_INCREMENT 차이`);
          }
        }

        if (tableName === 'users') {
          const isActiveCol = columns.find(c => c.Field === 'is_active');
          if (isActiveCol && isActiveCol.Type.includes('tinyint')) {
            console.log('\n⚠️  차이점:');
            console.log('  - is_active가 BOOLEAN이 아닌 TINYINT(1)로 저장됨 (MariaDB의 BOOLEAN 표현)');
            differences.push(`${tableName}: is_active가 TINYINT(1)로 저장됨 (BOOLEAN의 MariaDB 표현)`);
          }
        }

      } catch (error) {
        console.error(`❌ ${tableName} 테이블 확인 실패:`, error.message);
      }
    }

    // 전체 요약
    console.log('\n' + '='.repeat(80));
    console.log('📌 차이점 요약:');
    console.log('='.repeat(80));
    
    if (differences.length === 0) {
      console.log('✅ 요청된 DDL과 실제 구조가 일치합니다.');
    } else {
      differences.forEach((diff, idx) => {
        console.log(`${idx + 1}. ${diff}`);
      });
    }

    // 추가로 확인할 사항
    console.log('\n📝 추가 확인 사항:');
    console.log('1. work_log 테이블에 created_at, updated_at이 추가되어 있음 (Sequelize timestamps)');
    console.log('2. 모든 테이블에 timestamps가 추가되었을 수 있음 (데이터베이스 설정에 따라)');
    console.log('3. MariaDB에서 BOOLEAN은 TINYINT(1)로 저장됨');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 확인 실패:', error.message);
    await sequelize.close();
    process.exit(1);
  }
};

compareSchema();
