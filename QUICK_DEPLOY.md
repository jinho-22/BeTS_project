# ⚡ 빠른 배포 가이드

## 🎯 5분 배포 체크리스트

### 1단계: 서버 준비 (1분)
```bash
# 필수 소프트웨어 설치
sudo apt update
sudo apt install -y nodejs npm mariadb-server nginx
sudo npm install -g pm2
```

### 2단계: 데이터베이스 설정 (1분)
```bash
sudo mysql -u root -p
```
```sql
CREATE DATABASE bets_worklog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bets_user'@'localhost' IDENTIFIED BY '강력한_비밀번호';
GRANT ALL PRIVILEGES ON bets_worklog.* TO 'bets_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3단계: 프로젝트 배포 (2분)
```bash
# 프로젝트 디렉토리 생성
sudo mkdir -p /var/www/bets-worklog
sudo chown -R $USER:$USER /var/www/bets-worklog

# 코드 업로드 (Git 또는 SCP)
cd /var/www/bets-worklog
# git clone <repository> . 또는 파일 업로드

# 백엔드 설정
cd backend
cp .env.example .env
nano .env  # 환경 변수 설정
npm install --production
mkdir -p uploads logs
chmod 755 uploads

# 프론트엔드 빌드
cd ../frontend
npm install
npm run build
```

### 4단계: 서비스 시작 (1분)
```bash
# 백엔드 시작
cd /var/www/bets-worklog/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Nginx 설정
sudo cp nginx.conf.example /etc/nginx/sites-available/bets-worklog
sudo nano /etc/nginx/sites-available/bets-worklog  # 도메인 수정
sudo ln -s /etc/nginx/sites-available/bets-worklog /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5단계: 확인
```bash
# 백엔드 확인
pm2 status
curl http://localhost:4000/api/health

# 브라우저에서 접속
# http://your-server-ip
```

---

## 📝 필수 환경 변수 (.env)

```env
PORT=4000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bets_worklog
DB_USER=bets_user
DB_PASSWORD=강력한_비밀번호
JWT_SECRET=매우_강력한_랜덤_문자열_최소_32자
JWT_REFRESH_SECRET=매우_강력한_랜덤_문자열_최소_32자
```

---

## 🔄 업데이트 배포

```bash
cd /var/www/bets-worklog
./deploy.sh
```

또는 수동:
```bash
# 백엔드
cd backend && npm install --production && pm2 restart bets-backend

# 프론트엔드
cd frontend && npm install && npm run build && sudo systemctl reload nginx
```

---

## 🆘 문제 해결

### 백엔드가 시작 안 됨
```bash
pm2 logs bets-backend
cd backend && node src/server.js  # 직접 실행하여 에러 확인
```

### 502 Bad Gateway
```bash
pm2 status  # 백엔드 프로세스 확인
sudo tail -f /var/log/nginx/error.log
```

### 데이터베이스 연결 오류
```bash
mysql -u bets_user -p bets_worklog  # 연결 테스트
sudo systemctl status mariadb
```

---

자세한 내용은 `DEPLOYMENT.md` 참고
