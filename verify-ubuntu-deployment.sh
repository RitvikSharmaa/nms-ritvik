#!/bin/bash
################################################################################
# Ubuntu NMS Deployment Verification Script
################################################################################
# Run this on your offline Ubuntu VM after deployment
################################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

print_header() {
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
}

check_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNINGS++))
}

################################################################################
# 1. System Information
################################################################################
print_header "System Information"

echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "Hostname: $(hostname)"
echo "IP Address: $(hostname -I | awk '{print $1}')"
echo "CPU: $(nproc) cores"
echo "Memory: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $4}') free"
echo ""

################################################################################
# 2. Check Docker Installation
################################################################################
print_header "Docker Installation"

if command -v docker &> /dev/null; then
    check_pass "Docker installed: $(docker --version)"
else
    check_fail "Docker not installed"
    echo "Install Docker first! See UBUNTU_OFFLINE_SETUP.md"
    exit 1
fi

if command -v docker compose &> /dev/null || docker compose version &> /dev/null; then
    check_pass "Docker Compose installed"
else
    check_fail "Docker Compose not installed"
    exit 1
fi

# Check Docker service
if systemctl is-active --quiet docker; then
    check_pass "Docker service is running"
else
    check_fail "Docker service is not running"
    echo "Start it with: sudo systemctl start docker"
fi

# Check Docker permissions
if docker ps &> /dev/null; then
    check_pass "Docker permissions OK"
else
    check_warn "Cannot run docker commands without sudo"
    echo "Add user to docker group: sudo usermod -aG docker $USER"
fi

echo ""

################################################################################
# 3. Check Docker Images
################################################################################
print_header "Docker Images"

IMAGES=("postgres:16-alpine" "nginx:1.27-alpine" "node:20-alpine" "nms-api:latest" "nms-frontend:latest")

for img in "${IMAGES[@]}"; do
    if docker images | grep -q "${img%:*}"; then
        check_pass "Image exists: $img"
    else
        check_fail "Image missing: $img"
    fi
done

echo ""

################################################################################
# 4. Check Docker Containers
################################################################################
print_header "Docker Containers"

if [ ! -f "docker-compose.yml" ]; then
    check_fail "docker-compose.yml not found in current directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if containers are running
CONTAINERS=("postgres" "api" "frontend" "nginx")

for container in "${CONTAINERS[@]}"; do
    if docker compose ps | grep -q "$container.*Up"; then
        check_pass "Container running: $container"
    else
        check_fail "Container not running: $container"
    fi
done

echo ""
echo "Container Status:"
docker compose ps
echo ""

################################################################################
# 5. Check Network Connectivity
################################################################################
print_header "Network Connectivity"

# Check if port 80 is listening
if sudo lsof -i :80 &> /dev/null; then
    check_pass "Port 80 is open (nginx listening)"
else
    check_fail "Port 80 is not listening"
fi

# Check if API port is listening (internally)
if docker compose exec -T api nc -z localhost 4000 &> /dev/null; then
    check_pass "API port 4000 is listening"
else
    check_fail "API port 4000 is not listening"
fi

echo ""

################################################################################
# 6. Check API Health
################################################################################
print_header "API Health Check"

# Wait a moment for services to be ready
sleep 2

if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health)
    
    if [ "$HTTP_CODE" == "200" ]; then
        check_pass "API health endpoint returns 200 OK"
        
        # Get detailed health info
        HEALTH=$(curl -s http://localhost/api/health)
        echo ""
        echo "Health Details:"
        echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
        echo ""
    else
        check_fail "API health endpoint returns $HTTP_CODE"
    fi
else
    check_warn "curl not installed, skipping API health check"
fi

echo ""

################################################################################
# 7. Check Database
################################################################################
print_header "Database Verification"

# Check PostgreSQL is running
if docker compose exec -T postgres pg_isready -U nms &> /dev/null; then
    check_pass "PostgreSQL is accepting connections"
else
    check_fail "PostgreSQL is not accepting connections"
fi

# Check database exists
if docker compose exec -T postgres psql -U nms -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw nms; then
    check_pass "Database 'nms' exists"
else
    check_fail "Database 'nms' does not exist"
fi

# Count tables
TABLE_COUNT=$(docker compose exec -T postgres psql -U nms -d nms -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ "$TABLE_COUNT" == "17" ]; then
    check_pass "Database has 17 tables (correct)"
elif [ "$TABLE_COUNT" -gt 0 ]; then
    check_warn "Database has $TABLE_COUNT tables (expected 17)"
else
    check_fail "Database has no tables (migrations not run)"
fi

# List tables
echo ""
echo "Database Tables:"
docker compose exec -T postgres psql -U nms -d nms -c "\dt" 2>/dev/null || echo "Could not list tables"
echo ""

################################################################################
# 8. Check Monitoring Engine
################################################################################
print_header "Monitoring Engine"

# Check for monitoring logs in last 60 seconds
MONITORING_LOGS=$(docker compose logs --since 60s api 2>/dev/null | grep -i "monitoring cycle" | wc -l)

if [ "$MONITORING_LOGS" -gt 0 ]; then
    check_pass "Monitoring engine is active ($MONITORING_LOGS cycles in last 60s)"
else
    check_warn "No monitoring cycles detected in last 60 seconds"
    echo "Wait 30 seconds and check again: docker compose logs api | grep 'Monitoring cycle'"
fi

# Check scheduler logs
echo ""
echo "Recent Monitoring Logs:"
docker compose logs --tail=5 api 2>/dev/null | grep -E "(Monitoring|scheduler|cycle)" || echo "No monitoring logs found"
echo ""

################################################################################
# 9. Check Frontend
################################################################################
print_header "Frontend Verification"

if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
    
    if [ "$HTTP_CODE" == "200" ]; then
        check_pass "Frontend returns 200 OK"
    else
        check_fail "Frontend returns $HTTP_CODE"
    fi
else
    check_warn "curl not installed, skipping frontend check"
fi

################################################################################
# 10. Check Environment Configuration
################################################################################
print_header "Configuration Files"

if [ -f "server/.env" ]; then
    check_pass "server/.env exists"
    
    # Check critical variables
    if grep -q "JWT_SECRET=change-this" server/.env; then
        check_warn "JWT_SECRET is still default - CHANGE IT!"
    else
        check_pass "JWT_SECRET has been customized"
    fi
    
    if grep -q "ADMIN_PASSWORD=ChangeMe" server/.env; then
        check_warn "ADMIN_PASSWORD is still default - CHANGE IT!"
    else
        check_pass "ADMIN_PASSWORD has been customized"
    fi
else
    check_fail "server/.env not found"
    echo "Create it: cp server/.env.example server/.env"
fi

echo ""

################################################################################
# 11. Check System Resources
################################################################################
print_header "System Resources"

# Check disk space
DISK_FREE=$(df / | awk 'NR==2 {print $4}')
DISK_FREE_GB=$((DISK_FREE / 1024 / 1024))

if [ "$DISK_FREE_GB" -gt 10 ]; then
    check_pass "Disk space: ${DISK_FREE_GB}GB free"
else
    check_warn "Low disk space: ${DISK_FREE_GB}GB free (recommend 10GB+)"
fi

# Check memory
MEM_FREE=$(free -m | awk 'NR==2 {print $7}')

if [ "$MEM_FREE" -gt 2000 ]; then
    check_pass "Available memory: ${MEM_FREE}MB"
elif [ "$MEM_FREE" -gt 1000 ]; then
    check_warn "Available memory: ${MEM_FREE}MB (recommend 2GB+)"
else
    check_warn "Low memory: ${MEM_FREE}MB (may impact performance)"
fi

# Check CPU load
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
CPU_CORES=$(nproc)

echo "CPU load: $CPU_LOAD (${CPU_CORES} cores)"

echo ""

################################################################################
# 12. Check Logs for Errors
################################################################################
print_header "Error Analysis"

ERROR_COUNT=$(docker compose logs --since 10m 2>/dev/null | grep -i error | wc -l)

if [ "$ERROR_COUNT" -eq 0 ]; then
    check_pass "No errors in last 10 minutes"
else
    check_warn "$ERROR_COUNT error messages in last 10 minutes"
    echo ""
    echo "Recent Errors:"
    docker compose logs --since 10m 2>/dev/null | grep -i error | tail -5
fi

echo ""

################################################################################
# Final Summary
################################################################################
print_header "Verification Summary"

echo ""
echo -e "${GREEN}Passed:   $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed:   $FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ ALL CHECKS PASSED! Deployment is healthy!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Access your NMS at: http://localhost"
    echo "or http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "Default login:"
    echo "  Username: admin"
    echo "  Password: (check server/.env ADMIN_PASSWORD)"
    EXIT_CODE=0
elif [ "$FAILED" -eq 0 ]; then
    echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  ⚠ PASSED WITH WARNINGS${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Deployment is functional but has some warnings."
    echo "Review the warnings above and fix if necessary."
    EXIT_CODE=0
else
    echo -e "${RED}════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ✗ VERIFICATION FAILED${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Some checks failed. Review the errors above."
    echo ""
    echo "Common fixes:"
    echo "  • Start containers: docker compose up -d"
    echo "  • Check logs: docker compose logs"
    echo "  • Restart specific service: docker compose restart api"
    echo "  • Check configuration: cat server/.env"
    EXIT_CODE=1
fi

echo ""
echo "For detailed troubleshooting, see UBUNTU_OFFLINE_SETUP.md"
echo ""

exit $EXIT_CODE
