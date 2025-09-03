#!/bin/bash

# 🐳 Docker 자동 시작 및 앱 실행 스크립트

echo "🔍 Docker 상태 확인 중..."

# Docker daemon이 실행 중인지 확인
if ! docker info >/dev/null 2>&1; then
    echo "⚠️  Docker daemon이 실행되지 않았습니다."
    echo "🚀 Docker Desktop 자동 시작 중..."
    
    # macOS에서 Docker Desktop 자동 시작
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a Docker
        echo "⏳ Docker Desktop 시작을 기다리는 중... (최대 60초)"
        
        # Docker가 완전히 시작될 때까지 대기 (최대 60초)
        for i in {1..60}; do
            if docker info >/dev/null 2>&1; then
                echo "✅ Docker Desktop이 성공적으로 시작되었습니다!"
                break
            fi
            echo -n "."
            sleep 1
        done
        
        # 60초 후에도 시작되지 않으면 에러
        if ! docker info >/dev/null 2>&1; then
            echo ""
            echo "❌ Docker Desktop 시작에 실패했습니다."
            echo "💡 수동으로 Docker Desktop을 실행해주세요."
            exit 1
        fi
        
    else
        echo "❌ Docker daemon이 실행되지 않았습니다."
        echo "💡 다음 명령어로 Docker를 시작해주세요:"
        echo "   sudo systemctl start docker"
        exit 1
    fi
else
    echo "✅ Docker daemon이 이미 실행 중입니다."
fi

echo ""
echo "🛠️  Docker 이미지 빌드 시작..."
docker-compose build

echo ""
echo "🚀 애플리케이션 시작..."
docker-compose up