# 📦 BeTS Work Log System 배포 문서

## 📚 문서 목록

1. **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - 5분 빠른 배포 가이드 ⚡
2. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 상세 배포 가이드 📖
3. **[nginx.conf.example](./nginx.conf.example)** - Nginx 설정 예제
4. **[backend/ecosystem.config.js](./backend/ecosystem.config.js)** - PM2 설정 파일
5. **[deploy.sh](./deploy.sh)** - 자동 배포 스크립트

---

## 🚀 빠른 시작

### 최소 요구사항
- Ubuntu 20.04+ / Debian 11+
- Node.js 18+
- MariaDB 10.5+
- Nginx
- 2GB+ RAM

### 한 줄 배포 (자동화 스크립트 사용)
```bash
# 1. 서버에 코드 업로드
# 2. 환경 변수 설정 (backend/.env)
# 3. 실행
chmod +x deploy.sh
./deploy.sh
```

### 수동 배포
자세한 내용은 **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** 참고

---

## 📋 배포 체크리스트

### 사전 준비
- [ ] 서버 접속 정보 확인
- [ ] 도메인/IP 주소 확인
- [ ] 방화벽 포트 개방 (80, 443, 4000)
- [ ] SSL 인증서 준비 (HTTPS 사용 시)

### 데이터베이스
- [ ] MariaDB 설치 및 실행
- [ ] 데이터베이스 생성 (`bets_worklog`)
- [ ] 사용자 생성 및 권한 부여
- [ ] 초기 데이터 백업 (기존 데이터가 있는 경우)

### 백엔드
- [ ] Node.js 설치
- [ ] PM2 설치
- [ ] 환경 변수 설정 (`.env`)
- [ ] 의존성 설치
- [ ] 업로드 디렉토리 생성
- [ ] PM2로 서비스 시작

### 프론트엔드
- [ ] 의존성 설치
- [ ] 프로덕션 빌드
- [ ] 빌드 결과물 확인

### Nginx
- [ ] Nginx 설치
- [ ] 설정 파일 생성
- [ ] 도메인/IP 설정
- [ ] 설정 검증 및 재시작

### 확인
- [ ] 백엔드 API 동작 확인
- [ ] 프론트엔드 접속 확인
- [ ] 로그인 테스트
- [ ] 주요 기능 테스트

---

## 🔧 주요 명령어

### PM2 (프로세스 관리)
```bash
pm2 start ecosystem.config.js  # 시작
pm2 restart bets-backend        # 재시작
pm2 stop bets-backend           # 중지
pm2 logs bets-backend           # 로그 확인
pm2 status                      # 상태 확인
```

### Nginx
```bash
sudo nginx -t                    # 설정 검증
sudo systemctl reload nginx       # 재시작
sudo systemctl status nginx      # 상태 확인
```

### 데이터베이스
```bash
# 백업
mysqldump -u bets_user -p bets_worklog > backup.sql

# 복원
mysql -u bets_user -p bets_worklog < backup.sql
```

---

## 🆘 문제 해결

### 백엔드가 시작되지 않음
1. 로그 확인: `pm2 logs bets-backend`
2. 환경 변수 확인: `cat backend/.env`
3. 직접 실행: `cd backend && node src/server.js`

### 502 Bad Gateway
1. 백엔드 프로세스 확인: `pm2 status`
2. 포트 확인: `netstat -tlnp | grep 4000`
3. Nginx 에러 로그: `sudo tail -f /var/log/nginx/error.log`

### 데이터베이스 연결 오류
1. MariaDB 상태: `sudo systemctl status mariadb`
2. 연결 테스트: `mysql -u bets_user -p bets_worklog`
3. 권한 확인: `SHOW GRANTS FOR 'bets_user'@'localhost';`

---

## 📞 지원

자세한 배포 가이드는 **[DEPLOYMENT.md](./DEPLOYMENT.md)** 참고
