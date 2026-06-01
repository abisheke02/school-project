@echo off
echo ============================================
echo  School Management Platform — Docker Start
echo ============================================

REM Stop local PostgreSQL if running (avoids port conflict)
echo Stopping local PostgreSQL if running...
net stop postgresql-x64-16 2>nul
net stop postgresql-x64-15 2>nul
net stop postgresql-x64-14 2>nul
echo (If PostgreSQL wasn't running, the above errors are normal)

echo.
echo Building and starting all services...
docker compose down --remove-orphans
docker compose up --build -d

echo.
echo Waiting for services to be ready...
timeout /t 15 /nobreak >nul

echo.
echo ============================================
echo  STATUS
echo ============================================
docker compose ps

echo.
echo ============================================
echo  App is starting at: http://localhost:8080
echo  API health check:   http://localhost:8080/health
echo  Admin login:        Username=admin  Password=admin123
echo ============================================
echo.
echo To watch logs:  docker compose logs -f
echo To stop:        docker compose down
echo.
pause
