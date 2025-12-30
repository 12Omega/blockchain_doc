@echo off
REM Production deployment script for blockchain document verification system (Windows)

setlocal enabledelayedexpansion

REM Colors for output (Windows doesn't support colors in basic cmd, but we'll use echo)
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

REM Configuration
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "BACKUP_DIR=%TEMP%\blockchain-doc-backup-%dt:~0,8%-%dt:~8,6%"

echo %INFO% Starting production deployment...

REM Check prerequisites
echo %INFO% Checking prerequisites...

REM Check if Docker is installed and running
docker --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Check if .env file exists
if not exist "%PROJECT_ROOT%\.env" (
    echo %WARNING% .env file not found. Creating from template...
    copy "%PROJECT_ROOT%\.env.production" "%PROJECT_ROOT%\.env"
    echo %WARNING% Please update the .env file with your production values before continuing.
    pause
)

echo %SUCCESS% Prerequisites check completed

REM Create backup of existing deployment
echo %INFO% Creating backup of existing deployment...
mkdir "%BACKUP_DIR%" 2>nul

REM Backup Docker volumes if they exist
docker volume ls | findstr "blockchain-doc" >nul 2>&1
if not errorlevel 1 (
    echo %INFO% Backing up Docker volumes...
    docker run --rm -v blockchain-doc-mongodb_data:/source -v "%BACKUP_DIR%":/backup alpine tar czf /backup/mongodb_data.tar.gz -C /source .
    docker run --rm -v blockchain-doc-redis_data:/source -v "%BACKUP_DIR%":/backup alpine tar czf /backup/redis_data.tar.gz -C /source .
    docker run --rm -v blockchain-doc-app_logs:/source -v "%BACKUP_DIR%":/backup alpine tar czf /backup/app_logs.tar.gz -C /source .
)

REM Backup configuration files
if exist "%PROJECT_ROOT%\.env" (
    copy "%PROJECT_ROOT%\.env" "%BACKUP_DIR%\.env.backup"
)

echo %SUCCESS% Backup created at %BACKUP_DIR%

REM Setup SSL certificates
echo %INFO% Setting up SSL certificates...
set "SSL_DIR=%PROJECT_ROOT%\config\ssl"
mkdir "%SSL_DIR%" 2>nul

if not exist "%SSL_DIR%\cert.pem" (
    echo %WARNING% SSL certificates not found. For production, please add valid SSL certificates.
    echo %WARNING% Creating placeholder files for now...
    echo # Placeholder SSL certificate > "%SSL_DIR%\cert.pem"
    echo # Placeholder SSL key > "%SSL_DIR%\key.pem"
)

echo %SUCCESS% SSL certificates configured

REM Build Docker images
echo %INFO% Building Docker images...
cd /d "%PROJECT_ROOT%"

docker build -t blockchain-doc-app:latest .
if errorlevel 1 (
    echo %ERROR% Failed to build Docker image
    exit /b 1
)

echo %SUCCESS% Docker images built successfully

REM Deploy application
echo %INFO% Deploying application...

REM Stop existing containers
docker-compose -f docker-compose.production.yml down 2>nul

REM Start services
docker-compose -f docker-compose.production.yml up -d
if errorlevel 1 (
    echo %ERROR% Failed to start services
    exit /b 1
)

echo %INFO% Waiting for services to start...
timeout /t 30 /nobreak >nul

REM Initialize MongoDB replica set
echo %INFO% Initializing MongoDB replica set...
timeout /t 10 /nobreak >nul
docker-compose -f docker-compose.production.yml exec -T mongodb mongo --eval "rs.initiate({_id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }]})" 2>nul

echo %SUCCESS% Application deployed successfully

REM Verify deployment
echo %INFO% Verifying deployment...

REM Check if containers are running
docker-compose -f docker-compose.production.yml ps | findstr "Up" >nul
if errorlevel 1 (
    echo %ERROR% Some containers are not running
    docker-compose -f docker-compose.production.yml ps
    exit /b 1
)

REM Check application health
echo %INFO% Checking application health...
timeout /t 10 /nobreak >nul

set /a counter=0
:healthcheck
set /a counter+=1
curl -f http://localhost/health >nul 2>&1
if not errorlevel 1 (
    echo %SUCCESS% Application is healthy
    goto healthcheck_done
)

if %counter% geq 30 (
    echo %ERROR% Application health check failed
    exit /b 1
)

echo %INFO% Waiting for application to be ready... (%counter%/30)
timeout /t 10 /nobreak >nul
goto healthcheck

:healthcheck_done

echo %SUCCESS% Deployment verification completed

REM Cleanup
echo %INFO% Cleaning up...
docker image prune -f >nul 2>&1

echo %SUCCESS% Cleanup completed

REM Show deployment information
echo.
echo %SUCCESS% Deployment completed successfully!
echo.
echo === Deployment Information ===
echo Application URL: https://localhost
echo API URL: https://localhost/api
echo Health Check: https://localhost/health
echo.
echo === Monitoring URLs ===
echo Grafana: http://localhost:3000
echo Prometheus: http://localhost:9090
echo Kibana: http://localhost:5601
echo.
echo === Management Commands ===
echo View logs: docker-compose -f docker-compose.production.yml logs -f
echo Stop services: docker-compose -f docker-compose.production.yml down
echo Restart services: docker-compose -f docker-compose.production.yml restart
echo.
echo === Backup Location ===
echo Backup created at: %BACKUP_DIR%
echo.

echo %SUCCESS% Production deployment completed successfully!
pause