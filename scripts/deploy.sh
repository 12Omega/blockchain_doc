#!/bin/bash

set -e

echo "🚀 Starting production deployment..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | xargs)
fi

# Build and deploy containers
echo "📦 Building Docker containers..."
docker-compose -f docker-compose.production.yml build --no-cache

echo "🔄 Stopping existing containers..."
docker-compose -f docker-compose.production.yml down

echo "🆙 Starting new containers..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Health checks
echo "🏥 Performing health checks..."
curl -f http://localhost:3001/health || { echo "Backend health check failed"; exit 1; }
curl -f http://localhost/health || { echo "Frontend health check failed"; exit 1; }

# Run database migrations if needed
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.production.yml exec backend npm run migrate

echo "✅ Deployment completed successfully!"
echo "📊 Monitoring dashboard: http://localhost:3000"
echo "📈 Metrics: http://localhost:9090"