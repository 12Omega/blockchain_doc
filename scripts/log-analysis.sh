#!/bin/bash

set -e

# Log analysis and aggregation script
echo "📊 Starting log analysis..."

# Configuration
LOG_DIR="/var/log/docverify"
ANALYSIS_DIR="/tmp/log-analysis"
DATE_RANGE=${1:-"1 day ago"}

# Create analysis directory
mkdir -p "$ANALYSIS_DIR"

# Function to analyze error patterns
analyze_errors() {
    echo "🔍 Analyzing error patterns..."
    
    # Extract error logs from containers
    docker-compose -f docker-compose.production.yml logs --since="$DATE_RANGE" | grep -i error > "$ANALYSIS_DIR/errors.log" 2>/dev/null || touch "$ANALYSIS_DIR/errors.log"
    
    # Count error types
    echo "Error Summary:" > "$ANALYSIS_DIR/error_summary.txt"
    echo "==============" >> "$ANALYSIS_DIR/error_summary.txt"
    
    if [ -s "$ANALYSIS_DIR/errors.log" ]; then
        # Most common errors
        echo "" >> "$ANALYSIS_DIR/error_summary.txt"
        echo "Most Common Errors:" >> "$ANALYSIS_DIR/error_summary.txt"
        grep -oE 'Error: [^"]*' "$ANALYSIS_DIR/errors.log" | sort | uniq -c | sort -nr | head -10 >> "$ANALYSIS_DIR/error_summary.txt"
        
        # Error timeline
        echo "" >> "$ANALYSIS_DIR/error_summary.txt"
        echo "Error Timeline (by hour):" >> "$ANALYSIS_DIR/error_summary.txt"
        grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}' "$ANALYSIS_DIR/errors.log" | cut -c1-13 | sort | uniq -c >> "$ANALYSIS_DIR/error_summary.txt"
    else
        echo "No errors found in the specified time range." >> "$ANALYSIS_DIR/error_summary.txt"
    fi
    
    echo "✅ Error analysis complete"
}

# Function to analyze performance metrics
analyze_performance() {
    echo "⚡ Analyzing performance metrics..."
    
    # Extract response time logs
    docker-compose -f docker-compose.production.yml logs backend --since="$DATE_RANGE" | grep -E 'response_time|duration' > "$ANALYSIS_DIR/performance.log" 2>/dev/null || touch "$ANALYSIS_DIR/performance.log"
    
    echo "Performance Summary:" > "$ANALYSIS_DIR/performance_summary.txt"
    echo "===================" >> "$ANALYSIS_DIR/performance_summary.txt"
    
    if [ -s "$ANALYSIS_DIR/performance.log" ]; then
        # Average response times by endpoint
        echo "" >> "$ANALYSIS_DIR/performance_summary.txt"
        echo "Average Response Times by Endpoint:" >> "$ANALYSIS_DIR/performance_summary.txt"
        
        # Extract and calculate averages (simplified)
        grep -oE '/api/[^ ]+ [0-9]+ms' "$ANALYSIS_DIR/performance.log" | \
        awk '{endpoint=$1; time=$2; gsub(/ms/, "", time); sum[endpoint]+=time; count[endpoint]++} 
             END {for(e in sum) printf "%-30s %.2fms\n", e, sum[e]/count[e]}' | \
        sort -k2 -nr >> "$ANALYSIS_DIR/performance_summary.txt"
        
        # Slow requests (>1000ms)
        echo "" >> "$ANALYSIS_DIR/performance_summary.txt"
        echo "Slow Requests (>1000ms):" >> "$ANALYSIS_DIR/performance_summary.txt"
        grep -E '[0-9]{4,}ms' "$ANALYSIS_DIR/performance.log" | head -20 >> "$ANALYSIS_DIR/performance_summary.txt"
    else
        echo "No performance data found in the specified time range." >> "$ANALYSIS_DIR/performance_summary.txt"
    fi
    
    echo "✅ Performance analysis complete"
}

# Function to analyze user activity
analyze_activity() {
    echo "👥 Analyzing user activity..."
    
    # Extract access logs
    docker-compose -f docker-compose.production.yml logs backend --since="$DATE_RANGE" | grep -E 'POST|GET|PUT|DELETE' > "$ANALYSIS_DIR/access.log" 2>/dev/null || touch "$ANALYSIS_DIR/access.log"
    
    echo "Activity Summary:" > "$ANALYSIS_DIR/activity_summary.txt"
    echo "================" >> "$ANALYSIS_DIR/activity_summary.txt"
    
    if [ -s "$ANALYSIS_DIR/access.log" ]; then
        # Request counts by method
        echo "" >> "$ANALYSIS_DIR/activity_summary.txt"
        echo "Requests by Method:" >> "$ANALYSIS_DIR/activity_summary.txt"
        grep -oE 'POST|GET|PUT|DELETE' "$ANALYSIS_DIR/access.log" | sort | uniq -c | sort -nr >> "$ANALYSIS_DIR/activity_summary.txt"
        
        # Most accessed endpoints
        echo "" >> "$ANALYSIS_DIR/activity_summary.txt"
        echo "Most Accessed Endpoints:" >> "$ANALYSIS_DIR/activity_summary.txt"
        grep -oE '/api/[^ ]+' "$ANALYSIS_DIR/access.log" | sort | uniq -c | sort -nr | head -10 >> "$ANALYSIS_DIR/activity_summary.txt"
        
        # Activity by hour
        echo "" >> "$ANALYSIS_DIR/activity_summary.txt"
        echo "Activity by Hour:" >> "$ANALYSIS_DIR/activity_summary.txt"
        grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}' "$ANALYSIS_DIR/access.log" | cut -c12-13 | sort | uniq -c >> "$ANALYSIS_DIR/activity_summary.txt"
    else
        echo "No activity data found in the specified time range." >> "$ANALYSIS_DIR/activity_summary.txt"
    fi
    
    echo "✅ Activity analysis complete"
}

# Function to analyze blockchain transactions
analyze_blockchain() {
    echo "⛓️ Analyzing blockchain transactions..."
    
    # Extract blockchain-related logs
    docker-compose -f docker-compose.production.yml logs backend --since="$DATE_RANGE" | grep -i -E 'transaction|blockchain|contract' > "$ANALYSIS_DIR/blockchain.log" 2>/dev/null || touch "$ANALYSIS_DIR/blockchain.log"
    
    echo "Blockchain Summary:" > "$ANALYSIS_DIR/blockchain_summary.txt"
    echo "==================" >> "$ANALYSIS_DIR/blockchain_summary.txt"
    
    if [ -s "$ANALYSIS_DIR/blockchain.log" ]; then
        # Transaction success/failure rates
        echo "" >> "$ANALYSIS_DIR/blockchain_summary.txt"
        echo "Transaction Results:" >> "$ANALYSIS_DIR/blockchain_summary.txt"
        
        success_count=$(grep -c -i "transaction.*success\|confirmed" "$ANALYSIS_DIR/blockchain.log" || echo "0")
        failure_count=$(grep -c -i "transaction.*fail\|error\|revert" "$ANALYSIS_DIR/blockchain.log" || echo "0")
        total_count=$((success_count + failure_count))
        
        if [ $total_count -gt 0 ]; then
            success_rate=$(echo "scale=2; $success_count * 100 / $total_count" | bc -l 2>/dev/null || echo "0")
            echo "- Successful: $success_count ($success_rate%)" >> "$ANALYSIS_DIR/blockchain_summary.txt"
            echo "- Failed: $failure_count" >> "$ANALYSIS_DIR/blockchain_summary.txt"
            echo "- Total: $total_count" >> "$ANALYSIS_DIR/blockchain_summary.txt"
        else
            echo "- No transactions found" >> "$ANALYSIS_DIR/blockchain_summary.txt"
        fi
        
        # Gas usage analysis
        echo "" >> "$ANALYSIS_DIR/blockchain_summary.txt"
        echo "Gas Usage:" >> "$ANALYSIS_DIR/blockchain_summary.txt"
        grep -oE 'gas.*[0-9]+' "$ANALYSIS_DIR/blockchain.log" | head -10 >> "$ANALYSIS_DIR/blockchain_summary.txt" || echo "- No gas data found" >> "$ANALYSIS_DIR/blockchain_summary.txt"
    else
        echo "No blockchain data found in the specified time range." >> "$ANALYSIS_DIR/blockchain_summary.txt"
    fi
    
    echo "✅ Blockchain analysis complete"
}

# Function to generate comprehensive report
generate_report() {
    echo "📋 Generating comprehensive report..."
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="$ANALYSIS_DIR/comprehensive_report.txt"
    
    echo "Comprehensive Log Analysis Report" > "$report_file"
    echo "Generated: $timestamp" >> "$report_file"
    echo "Time Range: $DATE_RANGE" >> "$report_file"
    echo "=========================================" >> "$report_file"
    echo "" >> "$report_file"
    
    # Combine all summaries
    for summary_file in "$ANALYSIS_DIR"/*_summary.txt; do
        if [ -f "$summary_file" ]; then
            cat "$summary_file" >> "$report_file"
            echo "" >> "$report_file"
            echo "=========================================" >> "$report_file"
            echo "" >> "$report_file"
        fi
    done
    
    # System information
    echo "System Information:" >> "$report_file"
    echo "- Hostname: $(hostname)" >> "$report_file"
    echo "- Uptime: $(uptime -p)" >> "$report_file"
    echo "- Load Average: $(uptime | awk -F'load average:' '{print $2}')" >> "$report_file"
    echo "- Memory Usage: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2}')" >> "$report_file"
    echo "- Disk Usage: $(df / | awk 'NR==2{print $5}')" >> "$report_file"
    echo "" >> "$report_file"
    
    # Container status
    echo "Container Status:" >> "$report_file"
    docker-compose -f docker-compose.production.yml ps >> "$report_file"
    
    echo "Report generated: $report_file"
    
    # Create HTML version for better readability
    create_html_report "$report_file"
}

# Function to create HTML report
create_html_report() {
    local text_report=$1
    local html_report="${text_report%.txt}.html"
    
    cat > "$html_report" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Log Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 10px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .error { color: #d32f2f; }
        .warning { color: #f57c00; }
        .success { color: #388e3c; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Log Analysis Report</h1>
        <p>Generated: $(date '+%Y-%m-%d %H:%M:%S')</p>
    </div>
    <div class="section">
        <pre>$(cat "$text_report")</pre>
    </div>
</body>
</html>
EOF
    
    echo "HTML report generated: $html_report"
}

# Function to cleanup old analysis files
cleanup_old_files() {
    echo "🧹 Cleaning up old analysis files..."
    
    # Remove analysis files older than 7 days
    find "$ANALYSIS_DIR" -name "*.txt" -mtime +7 -delete 2>/dev/null || true
    find "$ANALYSIS_DIR" -name "*.html" -mtime +7 -delete 2>/dev/null || true
    find "$ANALYSIS_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    echo "✅ Cleanup complete"
}

# Main execution
echo "Starting log analysis for time range: $DATE_RANGE"
echo "================================================"

# Run all analysis functions
analyze_errors
analyze_performance
analyze_activity
analyze_blockchain

# Generate reports
generate_report

# Cleanup
cleanup_old_files

echo ""
echo "📊 Log analysis complete!"
echo "Results available in: $ANALYSIS_DIR"
echo ""
echo "Key files:"
echo "- comprehensive_report.txt: Complete analysis report"
echo "- comprehensive_report.html: HTML version of the report"
echo "- error_summary.txt: Error analysis"
echo "- performance_summary.txt: Performance metrics"
echo "- activity_summary.txt: User activity analysis"
echo "- blockchain_summary.txt: Blockchain transaction analysis"