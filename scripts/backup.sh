#!/bin/bash

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
MONGODB_URI=${MONGODB_URI}

echo "🔄 Starting backup process..."

# Create backup directory
mkdir -p $BACKUP_DIR

# MongoDB backup
echo "📊 Backing up MongoDB..."
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb_$DATE"

# Redis backup
echo "🔴 Backing up Redis..."
docker-compose -f docker-compose.production.yml exec redis redis-cli BGSAVE
docker cp $(docker-compose -f docker-compose.production.yml ps -q redis):/data/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Application logs backup
echo "📝 Backing up application logs..."
docker-compose -f docker-compose.production.yml logs --no-color > "$BACKUP_DIR/app_logs_$DATE.log"

# Compress backups
echo "🗜️ Compressing backups..."
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "mongodb_$DATE" "redis_$DATE.rdb" "app_logs_$DATE.log"

# Clean up individual files
rm -rf "$BACKUP_DIR/mongodb_$DATE" "$BACKUP_DIR/redis_$DATE.rdb" "$BACKUP_DIR/app_logs_$DATE.log"

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete

echo "✅ Backup completed: backup_$DATE.tar.gz"