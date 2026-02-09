#!/bin/bash

# BeTS Work Log System 배포 스크립트
# 사용법: ./deploy.sh

set -e  # 에러 발생 시 스크립트 중단

echo "🚀 BeTS Work Log System 배포 시작..."

# 프로젝트 루트 디렉토리
PROJECT_ROOT="/var/www/bets-worklog"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 1. 백엔드 배포
echo ""
echo "📦 백엔드 배포 중..."
cd $BACKEND_DIR

# 의존성 설치
echo "  - 의존성 설치 중..."
npm install --production

# 업로드 디렉토리 확인
if [ ! -d "uploads" ]; then
  echo "  - 업로드 디렉토리 생성 중..."
  mkdir -p uploads
  chmod 755 uploads
fi

# 로그 디렉토리 확인
if [ ! -d "logs" ]; then
  echo "  - 로그 디렉토리 생성 중..."
  mkdir -p logs
fi

# PM2로 재시작
echo "  - PM2로 백엔드 재시작 중..."
pm2 restart bets-backend || pm2 start ecosystem.config.js
pm2 save

echo "✅ 백엔드 배포 완료"

# 2. 프론트엔드 배포
echo ""
echo "📦 프론트엔드 배포 중..."
cd $FRONTEND_DIR

# 의존성 설치
echo "  - 의존성 설치 중..."
npm install

# 빌드
echo "  - 빌드 중..."
npm run build

echo "✅ 프론트엔드 배포 완료"

# 3. Nginx 재시작
echo ""
echo "🔄 Nginx 재시작 중..."
sudo systemctl reload nginx

echo ""
echo "✅ 배포 완료!"
echo ""
echo "📋 확인 사항:"
echo "  - 백엔드 상태: pm2 status"
echo "  - 백엔드 로그: pm2 logs bets-backend"
echo "  - Nginx 상태: sudo systemctl status nginx"
echo ""
