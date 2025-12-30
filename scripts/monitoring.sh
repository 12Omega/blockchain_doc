#!/bin/bash

set -e

# Monitoring and health check script
echo "🔍 Starting system monitoring checks..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service_name=$1
    local health_url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $service_name... "
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" 2>/dev/null); then
        if [ "$response" -eq "$expected_status" ]; then
            echo -e "${GREEN}✅ Healthy${NC}"
            return 0
        else
            echo -e "${RED}❌ Unhealthy (HTTP $response)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Unreachable${NC}"
        return 1
    fi
}

# Function to check database connection
check_database() {
    echo -n "Checking MongoDB connection... "
    
    if docker-compose -f docker-compose.production.yml exec -T backend node -e "
        const mongoose = require('mongoose');
        mongoose.connect(process.env.MONGODB_URI)
            .then(() => { console.log('Connected'); process.exit(0); })
            .catch(() => process.exit(1));
    " > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
        return 0
    else
        echo -e "${RED}❌ Connection failed${NC}"
        return 1
    fi
}

# Function to check Redis
check_redis() {
    echo -n "Checking Redis connection... "
    
    if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping | grep -q "PONG"; then
        echo -e "${GREEN}✅ Connected${NC}"
        return 0
    else
        echo -e "${RED}❌ Connection failed${NC}"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    echo -n "Checking disk space... "
    
    usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        echo -e "${GREEN}✅ $usage% used${NC}"
        return 0
    elif [ "$usage" -lt 90 ]; then
        echo -e "${YELLOW}⚠️ $usage% used${NC}"
        return 0
    else
        echo -e "${RED}❌ $usage% used (Critical)${NC}"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    echo -n "Checking memory usage... "
    
    usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -lt 80 ]; then
        echo -e "${GREEN}✅ $usage% used${NC}"
        return 0
    elif [ "$usage" -lt 90 ]; then
        echo -e "${YELLOW}⚠️ $usage% used${NC}"
        return 0
    else
        echo -e "${RED}❌ $usage% used (Critical)${NC}"
        return 1
    fi
}

# Function to check container status
check_containers() {
    echo "Checking container status:"
    
    containers=("frontend" "backend" "redis" "monitoring" "grafana")
    all_healthy=true
    
    for container in "${containers[@]}"; do
        echo -n "  $container... "
        
        if docker-compose -f docker-compose.production.yml ps "$container" | grep -q "Up"; then
            echo -e "${GREEN}✅ Running${NC}"
        else
            echo -e "${RED}❌ Not running${NC}"
            all_healthy=false
        fi
    done
    
    return $all_healthy
}

# Function to check SSL certificate
check_ssl() {
    echo -n "Checking SSL certificate... "
    
    if command -v openssl >/dev/null 2>&1; then
        expiry=$(echo | openssl s_client -servername localhost -connect localhost:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
        current_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [ "$days_left" -gt 30 ]; then
            echo -e "${GREEN}✅ Valid ($days_left days left)${NC}"
            return 0
        elif [ "$days_left" -gt 7 ]; then
            echo -e "${YELLOW}⚠️ Expires soon ($days_left days left)${NC}"
            return 0
        else
            echo -e "${RED}❌ Expires soon ($days_left days left)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ OpenSSL not available${NC}"
        return 0
    fi
}

# Function to generate monitoring report
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="/tmp/monitoring_report_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "System Monitoring Report - $timestamp" > "$report_file"
    echo "================================================" >> "$report_file"
    echo "" >> "$report_file"
    
    # System information
    echo "System Information:" >> "$report_file"
    echo "- Hostname: $(hostname)" >> "$report_file"
    echo "- Uptime: $(uptime -p)" >> "$report_file"
    echo "- Load Average: $(uptime | awk -F'load average:' '{print $2}')" >> "$report_file"
    echo "" >> "$report_file"
    
    # Container status
    echo "Container Status:" >> "$report_file"
    docker-compose -f docker-compose.production.yml ps >> "$report_file"
    echo "" >> "$report_file"
    
    # Resource usage
    echo "Resource Usage:" >> "$report_file"
    echo "- Memory:" >> "$report_file"
    free -h >> "$report_file"
    echo "" >> "$report_file"
    echo "- Disk:" >> "$report_file"
    df -h >> "$report_file"
    echo "" >> "$report_file"
    
    # Recent logs
    echo "Recent Error Logs:" >> "$report_file"
    docker-compose -f docker-compose.production.yml logs --tail=50 --since=1h | grep -i error >> "$report_file" 2>/dev/null || echo "No recent errors found" >> "$report_file"
    
    echo "Report generated: $report_file"
}

# Main monitoring checks
echo "🏥 Health Checks:"
echo "=================="

failed_checks=0

# Service health checks
check_service "Frontend" "http://localhost/health" || ((failed_checks++))
check_service "Backend" "http://localhost:3001/health" || ((failed_checks++))
check_service "Monitoring" "http://localhost:9090/-/healthy" || ((failed_checks++))
check_service "Grafana" "http://localhost:3000/api/health" || ((failed_checks++))

echo ""
echo "🔌 Connection Checks:"
echo "===================="

# Database and cache checks
check_database || ((failed_checks++))
check_redis || ((failed_checks++))

echo ""
echo "💻 System Checks:"
echo "================="

# System resource checks
check_disk_space || ((failed_checks++))
check_memory || ((failed_checks++))

echo ""
echo "🐳 Container Checks:"
echo "==================="

# Container status checks
check_containers || ((failed_checks++))

echo ""
echo "🔒 Security Checks:"
echo "=================="

# SSL certificate check
check_ssl || ((failed_checks++))

echo ""
echo "📊 Summary:"
echo "==========="

if [ $failed_checks -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! System is healthy.${NC}"
    exit 0
else
    echo -e "${RED}❌ $failed_checks check(s) failed. System needs attention.${NC}"
    
    # Generate detailed report for failed checks
    generate_report
    
    # Send alert if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "Sending alert to $ALERT_EMAIL..."
        # Add email notification logic here
    fi
    
    exit 1
fi