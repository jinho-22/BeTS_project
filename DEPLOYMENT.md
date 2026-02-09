# 🚀 BeTS Work Log System 배포 가이드

## 📋 목차
1. [사전 준비사항](#사전-준비사항)
2. [서버 환경 설정](#서버-환경-설정)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [백엔드 배포](#백엔드-배포)
5. [프론트엔드 배포](#프론트엔드-배포)
6. [Nginx 설정](#nginx-설정)
7. [프로세스 관리 (PM2)](#프로세스-관리-pm2)
8. [배포 확인](#배포-확인)
9. [트러블슈팅](#트러블슈팅)

---

## 사전 준비사항

### 필수 소프트웨어
- **Node.js** (v18 이상 권장)
- **MariaDB** (v10.5 이상)
- **Nginx** (리버스 프록시용)
- **PM2** (프로세스 관리)
- **Git** (코드 배포용)

### 서버 요구사항
- 최소 2GB RAM
- 최소 10GB 디스크 공간
- 포트: 4000 (백엔드), 80/443 (Nginx)

---

## 서버 환경 설정

### 1. Node.js 설치 확인
```bash
node --version  # v18 이상
npm --version
```

### 2. PM2 전역 설치
```bash
npm install -g pm2
```

### 3. 프로젝트 디렉토리 생성
```bash
mkdir -p /var/www/bets-worklog
cd /var/www/bets-worklog
```

---

## 데이터베이스 설정

### 1. MariaDB 설치 및 실행
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb

# MariaDB 보안 설정
sudo mysql_secure_installation
```

### 2. 데이터베이스 및 사용자 생성
```bash
sudo mysql -u root -p
```

```sql
-- 데이터베이스 생성
CREATE DATABASE bets_worklog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 생성 (비밀번호는 실제 값으로 변경)
CREATE USER 'bets_user'@'localhost' IDENTIFIED BY '강력한_비밀번호';
GRANT ALL PRIVILEGES ON bets_worklog.* TO 'bets_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. DDL 실행 (선택사항)
초기 테이블 구조를 수동으로 생성하려면:
```bash
mysql -u bets_user -p bets_worklog < schema.sql
```

또는 Sequelize sync를 사용 (권장):
- 백엔드 실행 시 자동으로 테이블 생성됨

---

## 백엔드 배포

### 1. 코드 업로드
```bash
# Git을 사용하는 경우
cd /var/www/bets-worklog
git clone <repository-url> .
# 또는
# SCP/FTP로 파일 업로드
```

### 2. 환경 변수 설정
```bash
cd /var/www/bets-worklog/backend
cp .env.example .env  # 또는 직접 생성
nano .env
```

`.env` 파일 내용:
```env
# 서버 설정
PORT=4000
NODE_ENV=production

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bets_worklog
DB_USER=bets_user
DB_PASSWORD=강력한_비밀번호

# JWT 설정 (반드시 변경!)
JWT_SECRET=매우_강력한_랜덤_문자열_최소_32자
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=매우_강력한_랜덤_문자열_최소_32자
JWT_REFRESH_EXPIRES_IN=7d

# 파일 업로드 설정
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

### 3. 의존성 설치
```bash
cd /var/www/bets-worklog/backend
npm install --production
```

### 4. 업로드 디렉토리 생성
```bash
mkdir -p /var/www/bets-worklog/backend/uploads
chmod 755 /var/www/bets-worklog/backend/uploads
```

### 5. PM2로 백엔드 실행
```bash
cd /var/www/bets-worklog/backend
pm2 start src/server.js --name bets-backend
pm2 save
pm2 startup  # 시스템 재시작 시 자동 시작 설정
```

### 6. PM2 상태 확인
```bash
pm2 status
pm2 logs bets-backend
```

---

## 프론트엔드 배포

### 1. 의존성 설치 및 빌드
```bash
cd /var/www/bets-worklog/frontend
npm install
npm run build
```

빌드 결과물은 `frontend/dist` 디렉토리에 생성됩니다.

### 2. 빌드 확인
```bash
ls -la frontend/dist
```

---

## Nginx 설정

### 1. Nginx 설치
```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Nginx 설정 파일 생성
```bash
sudo nano /etc/nginx/sites-available/bets-worklog
```

설정 내용:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 실제 도메인으로 변경

    # 프론트엔드 정적 파일
    location / {
        root /var/www/bets-worklog/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 백엔드 API 프록시
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 파일 업로드 크기 제한
    client_max_body_size 10M;
}
```

### 3. 심볼릭 링크 생성 및 활성화
```bash
sudo ln -s /etc/nginx/sites-available/bets-worklog /etc/nginx/sites-enabled/
sudo nginx -t  # 설정 파일 검증
sudo systemctl reload nginx
```

### 4. 방화벽 설정 (필요시)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

---

## 프로세스 관리 (PM2)

### PM2 주요 명령어
```bash
# 프로세스 상태 확인
pm2 status

# 로그 확인
pm2 logs bets-backend
pm2 logs bets-backend --lines 100  # 최근 100줄

# 프로세스 재시작
pm2 restart bets-backend

# 프로세스 중지
pm2 stop bets-backend

# 프로세스 삭제
pm2 delete bets-backend

# 모니터링
pm2 monit
```

### PM2 설정 파일 (ecosystem.config.js)
```bash
cd /var/www/bets-worklog/backend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'bets-backend',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
```

사용:
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## 배포 확인

### 1. 백엔드 API 확인
```bash
curl http://localhost:4000/api/health
# 또는
curl http://your-domain.com/api/health
```

### 2. 프론트엔드 확인
브라우저에서 `http://your-domain.com` 접속

### 3. 로그인 테스트
- 관리자 계정으로 로그인 테스트
- 기본 기능 동작 확인

---

## 트러블슈팅

### 백엔드가 시작되지 않는 경우
```bash
# 로그 확인
pm2 logs bets-backend

# 환경 변수 확인
cd /var/www/bets-worklog/backend
cat .env

# 데이터베이스 연결 확인
mysql -u bets_user -p bets_worklog
```

### Nginx 502 Bad Gateway 오류
```bash
# 백엔드 프로세스 확인
pm2 status

# 백엔드 포트 확인
netstat -tlnp | grep 4000

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### 데이터베이스 연결 오류
```bash
# MariaDB 상태 확인
sudo systemctl status mariadb

# 데이터베이스 사용자 권한 확인
mysql -u root -p
SHOW GRANTS FOR 'bets_user'@'localhost';
```

### 파일 업로드 오류
```bash
# 업로드 디렉토리 권한 확인
ls -la /var/www/bets-worklog/backend/uploads
chmod 755 /var/www/bets-worklog/backend/uploads
chown -R www-data:www-data /var/www/bets-worklog/backend/uploads
```

---

## 업데이트 배포 절차

### 1. 코드 업데이트
```bash
cd /var/www/bets-worklog
git pull  # 또는 새 파일 업로드
```

### 2. 백엔드 업데이트
```bash
cd /var/www/bets-worklog/backend
npm install --production
pm2 restart bets-backend
```

### 3. 프론트엔드 업데이트
```bash
cd /var/www/bets-worklog/frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## 보안 체크리스트

- [ ] `.env` 파일 권한 설정 (600)
- [ ] JWT Secret 강력한 랜덤 문자열 사용
- [ ] 데이터베이스 비밀번호 강력하게 설정
- [ ] Nginx SSL/TLS 설정 (HTTPS)
- [ ] 방화벽 설정 (필요한 포트만 개방)
- [ ] 정기적인 백업 설정
- [ ] PM2 로그 로테이션 설정

---

## 백업

### 데이터베이스 백업
```bash
# 백업
mysqldump -u bets_user -p bets_worklog > backup_$(date +%Y%m%d).sql

# 복원
mysql -u bets_user -p bets_worklog < backup_20240209.sql
```

### 자동 백업 스크립트 (crontab)
```bash
# 매일 새벽 2시에 백업
0 2 * * * mysqldump -u bets_user -p비밀번호 bets_worklog > /backup/bets_worklog_$(date +\%Y\%m\%d).sql
```

---

## 추가 리소스

- [PM2 공식 문서](https://pm2.keymetrics.io/)
- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [MariaDB 공식 문서](https://mariadb.com/kb/en/documentation/)
