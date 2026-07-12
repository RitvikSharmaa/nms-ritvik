#!/bin/bash
################################################################################
# NMS Offline Package Creation Script
################################################################################
# Run this on a machine WITH internet to download all dependencies
# for offline/air-gapped deployment
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="nms-ritvik"
PACKAGE_DIR="nms-offline-package-$(date +%Y%m%d-%H%M%S)"
NODE_VERSION="20.11.0"

# Functions
print_header() {
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 not found. Please install it first."
        exit 1
    fi
    print_success "$1 found"
}

################################################################################
# Pre-flight checks
################################################################################
print_header "Pre-flight Checks"

check_command "docker"
check_command "git"
check_command "wget"
check_command "tar"
check_command "sha256sum"

print_success "All required commands available"
echo ""

################################################################################
# Create package directory
################################################################################
print_header "Creating Package Directory"

mkdir -p "$PACKAGE_DIR"
cd "$PACKAGE_DIR"
print_success "Created: $PACKAGE_DIR"
echo ""

################################################################################
# 1. Download Node.js
################################################################################
print_header "Downloading Node.js v${NODE_VERSION}"

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" == "x86_64" ]; then
    NODE_ARCH="x64"
    NODE_FILE="node-v${NODE_VERSION}-linux-x64.tar.xz"
elif [ "$ARCH" == "aarch64" ] || [ "$ARCH" == "arm64" ]; then
    NODE_ARCH="arm64"
    NODE_FILE="node-v${NODE_VERSION}-linux-arm64.tar.xz"
else
    print_error "Unsupported architecture: $ARCH"
    exit 1
fi

print_warning "Detected architecture: $ARCH (downloading $NODE_ARCH version)"

wget -q --show-progress "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_FILE}" || {
    print_error "Failed to download Node.js"
    exit 1
}
wget -q "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"

print_success "Downloaded Node.js"
echo ""

################################################################################
# 2. Clone Repository
################################################################################
print_header "Cloning Repository"

# If already in repository, use current directory
if [ -d "../.git" ]; then
    print_warning "Already in repository, copying current directory..."
    cp -r .. "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    # Clean up
    rm -rf node_modules server/node_modules .git
    cd ..
else
    print_error "Not in a git repository. Please run this script from the project root."
    print_error "Or clone manually: git clone <repo-url>"
    exit 1
fi

print_success "Repository ready"
echo ""

################################################################################
# 3. Install Frontend Dependencies
################################################################################
print_header "Installing Frontend Dependencies"

cd "$PROJECT_NAME"

echo "Running npm install (this may take several minutes)..."
npm install --legacy-peer-deps 2>&1 | grep -E "(added|removed|^$)" || true

if [ -d "node_modules" ]; then
    print_success "Frontend dependencies installed"
    
    # Package node_modules
    print_warning "Packaging frontend dependencies..."
    tar -czf ../frontend-node_modules.tar.gz node_modules/
    print_success "Frontend dependencies packaged"
    
    # Get NPM cache
    print_warning "Copying NPM cache..."
    NPM_CACHE=$(npm config get cache)
    mkdir -p ../npm-cache-frontend
    cp -r "$NPM_CACHE" ../npm-cache-frontend/ 2>/dev/null || true
    print_success "NPM cache copied"
else
    print_error "Frontend dependencies failed to install"
    exit 1
fi

echo ""

################################################################################
# 4. Install Backend Dependencies
################################################################################
print_header "Installing Backend Dependencies"

cd server

echo "Running npm install (this may take several minutes)..."
npm install 2>&1 | grep -E "(added|removed|^$)" || true

if [ -d "node_modules" ]; then
    print_success "Backend dependencies installed"
    
    # Package node_modules
    print_warning "Packaging backend dependencies..."
    tar -czf ../../backend-node_modules.tar.gz node_modules/
    print_success "Backend dependencies packaged"
    
    # Get NPM cache
    print_warning "Copying NPM cache..."
    NPM_CACHE=$(npm config get cache)
    mkdir -p ../../npm-cache-backend
    cp -r "$NPM_CACHE" ../../npm-cache-backend/ 2>/dev/null || true
    print_success "NPM cache copied"
else
    print_error "Backend dependencies failed to install"
    exit 1
fi

cd ../..

echo ""

################################################################################
# 5. Download Docker Base Images
################################################################################
print_header "Downloading Docker Images"

echo "Pulling postgres:16-alpine..."
docker pull postgres:16-alpine
print_success "PostgreSQL image pulled"

echo "Pulling nginx:1.27-alpine..."
docker pull nginx:1.27-alpine
print_success "Nginx image pulled"

echo "Pulling node:20-alpine..."
docker pull node:20-alpine
print_success "Node image pulled"

echo ""
print_header "Saving Docker Images"

docker save postgres:16-alpine -o postgres-16-alpine.tar
print_success "PostgreSQL image saved"

docker save nginx:1.27-alpine -o nginx-1.27-alpine.tar
print_success "Nginx image saved"

docker save node:20-alpine -o node-20-alpine.tar
print_success "Node image saved"

echo ""

################################################################################
# 6. Build Custom Docker Images
################################################################################
print_header "Building Custom Docker Images"

cd "$PROJECT_NAME"

echo "Building backend API image..."
docker build -f server/Dockerfile -t nms-api:latest . 2>&1 | grep -E "(Step|Successfully)" || true
if [ $? -eq 0 ]; then
    print_success "Backend API image built"
else
    print_error "Backend API image build failed"
    exit 1
fi

echo "Building frontend image..."
docker build -f Dockerfile.frontend -t nms-frontend:latest . 2>&1 | grep -E "(Step|Successfully)" || true
if [ $? -eq 0 ]; then
    print_success "Frontend image built"
else
    print_error "Frontend image build failed"
    exit 1
fi

cd ..

echo ""
print_header "Saving Custom Docker Images"

docker save nms-api:latest -o nms-api.tar
print_success "Backend API image saved"

docker save nms-frontend:latest -o nms-frontend.tar
print_success "Frontend image saved"

echo ""

################################################################################
# 7. Download System Packages (Debian/Ubuntu only)
################################################################################
print_header "Downloading System Packages"

if command -v apt-get &> /dev/null; then
    mkdir -p system-packages-debian
    cd system-packages-debian
    
    print_warning "Downloading .deb packages..."
    apt-get download \
        iputils-ping \
        libsnmp-dev \
        libsnmp40 \
        snmp \
        build-essential \
        gcc \
        g++ \
        make \
        python3 \
        python3-dev \
        libpq-dev \
        libssl-dev 2>&1 | grep -E "(Downloading|Get:)" || true
    
    cd ..
    print_success "System packages downloaded (Debian/Ubuntu)"
else
    print_warning "apt-get not found, skipping system package download"
    print_warning "If target is RHEL/CentOS, run: yumdownloader --resolve <packages>"
fi

echo ""

################################################################################
# 8. Create Checksums
################################################################################
print_header "Creating Checksums"

sha256sum *.tar 2>/dev/null > CHECKSUMS.txt || true
sha256sum *.tar.gz 2>/dev/null >> CHECKSUMS.txt || true
sha256sum *.xz 2>/dev/null >> CHECKSUMS.txt || true

print_success "Checksums created"
echo ""

################################################################################
# 9. Create Installation Guide
################################################################################
print_header "Creating Installation Guide"

cat > INSTALLATION.txt << 'EOF'
╔══════════════════════════════════════════════════════════════════════════╗
║                   NMS OFFLINE INSTALLATION PACKAGE                       ║
║                  Enterprise Network Monitoring System                    ║
╚══════════════════════════════════════════════════════════════════════════╝

📦 PACKAGE CONTENTS
═══════════════════

1. node-vXX.XX.X-linux-xxx.tar.xz       Node.js runtime
2. postgres-16-alpine.tar               PostgreSQL Docker image
3. nginx-1.27-alpine.tar                Nginx Docker image
4. node-20-alpine.tar                   Node.js Docker image
5. nms-api.tar                          Backend API Docker image (custom)
6. nms-frontend.tar                     Frontend Docker image (custom)
7. frontend-node_modules.tar.gz         Frontend NPM dependencies (~440 pkgs)
8. backend-node_modules.tar.gz          Backend NPM dependencies (~180 pkgs)
9. npm-cache-frontend/                  NPM cache (frontend)
10. npm-cache-backend/                  NPM cache (backend)
11. system-packages-debian/             System .deb packages (Ubuntu/Debian)
12. nms-ritvik/                         Source code & configuration
13. CHECKSUMS.txt                       SHA256 checksums for verification
14. INSTALLATION.txt                    This file

Total Size: ~800MB-1.2GB compressed, ~2-3GB extracted

🔧 INSTALLATION STEPS
═════════════════════

STEP 1: Verify Integrity
─────────────────────────
$ sha256sum -c CHECKSUMS.txt

All files should show "OK"

STEP 2: Load Docker Images
───────────────────────────
$ docker load -i postgres-16-alpine.tar
$ docker load -i nginx-1.27-alpine.tar
$ docker load -i node-20-alpine.tar
$ docker load -i nms-api.tar
$ docker load -i nms-frontend.tar

Verify:
$ docker images

You should see all 5 images listed.

STEP 3: Install System Packages (Optional)
───────────────────────────────────────────
Only needed if rebuilding from source on target machine.
NOT needed if using pre-built Docker images.

Ubuntu/Debian:
$ cd system-packages-debian
$ sudo dpkg -i *.deb
$ cd ..

RHEL/CentOS:
$ cd system-packages-rhel
$ sudo rpm -ivh *.rpm
$ cd ..

STEP 4: Prepare Source Code
────────────────────────────
$ cd nms-ritvik

# Extract frontend dependencies (optional - already in Docker image)
$ tar -xzf ../frontend-node_modules.tar.gz

# Extract backend dependencies (optional - already in Docker image)
$ cd server
$ tar -xzf ../../backend-node_modules.tar.gz
$ cd ..

STEP 5: Configure Environment
──────────────────────────────
$ cp server/.env.example server/.env
$ nano server/.env  # or vi, vim, emacs, etc.

CRITICAL SETTINGS TO CHANGE:
───────────────────────────
JWT_SECRET=<random-64-character-string>
ADMIN_PASSWORD=<secure-password>
DATABASE_URL=postgres://nms:nms_secret@postgres:5432/nms

SNMP SETTINGS (adjust for your network):
────────────────────────────────────────
SNMP_COMMUNITY=public
SNMP_PORT=161

MONITORING SETTINGS:
───────────────────
POLL_INTERVAL_SECONDS=30
ICMP_PACKET_COUNT=4

STEP 6: Start Services
──────────────────────
$ docker compose up -d

This will start:
- PostgreSQL database
- Backend API
- Frontend application
- Nginx reverse proxy

STEP 7: Verify Deployment
──────────────────────────
# Check all containers are running
$ docker compose ps

Expected output:
NAME                STATUS
nms-postgres        Up (healthy)
nms-api             Up (healthy)
nms-frontend        Up
nms-nginx           Up

# Check API health
$ curl http://localhost/api/health

Expected: {"status":"healthy",...}

# Check database migrations
$ docker compose logs api | grep -i migration

Expected: "Migrations completed successfully"

STEP 8: Access Application
───────────────────────────
Open web browser:
http://localhost

Or from another machine:
http://<server-ip>

DEFAULT LOGIN:
Username: admin
Password: <whatever you set in ADMIN_PASSWORD>

✅ SUCCESS CRITERIA
═══════════════════

Your deployment is successful when:

 ✓ All 4 Docker containers running (postgres, api, frontend, nginx)
 ✓ Database has 17 tables with seed data
 ✓ API health endpoint returns 200 OK
 ✓ Frontend loads at http://localhost
 ✓ Dashboard shows 5 network cards
 ✓ Can log in as admin
 ✓ Monitoring cycle logs appear every 30 seconds
 ✓ Can upload devices via CSV/XLSX
 ✓ Swagger docs accessible at /api/docs
 ✓ No errors in docker compose logs

🔍 TROUBLESHOOTING
══════════════════

Issue: Containers won't start
─────────────────────────────
$ docker compose logs api
$ docker compose logs postgres

Common causes:
- Port 80 already in use (change in docker-compose.yml)
- Database not ready (wait 30 seconds and retry)
- Permissions issue (check Docker socket access)

Issue: Can't ping devices
──────────────────────────
$ docker compose exec api ping 192.168.1.1

If fails, check:
- Container has NET_RAW capability (already in docker-compose.yml)
- Network routing from container to target network
- Firewall rules

Issue: Database connection failed
──────────────────────────────────
$ docker compose exec postgres psql -U nms -d nms

If fails, check:
- DATABASE_URL in server/.env matches docker-compose.yml
- Postgres container is running and healthy

Issue: Frontend shows "Connection refused"
───────────────────────────────────────────
Check:
- Backend API is running: docker compose ps api
- API health: curl http://localhost/api/health
- Nginx config: docker compose logs nginx

📚 DOCUMENTATION
════════════════

See included documentation files:
- README.md                          Quick start & overview
- ARCHITECTURE_AUDIT.md              System architecture details
- CODE_EXPLANATION.md                Backend code walkthrough
- FRONTEND_EXPLANATION.md            Frontend code walkthrough
- OFFLINE_DEPLOYMENT_GUIDE.md        This deployment guide
- DATABASE_SCHEMA_REVIEW.md          Database design
- MONITORING_ENGINE_IMPROVEMENTS.md  Monitoring system details

📞 VERSION INFORMATION
══════════════════════

NMS Version:        1.0.0
Node.js:            20.11.0
PostgreSQL:         16
Docker:             20.10+
Package Date:       [Generated from script]

🎉 DEPLOYMENT COMPLETE
══════════════════════

Your Enterprise NMS is now running completely offline!

Next Steps:
1. Upload your device inventory (CSV/XLSX)
2. Configure alert thresholds in Settings
3. Monitor your network in real-time

For support, see documentation files or contact your system administrator.
EOF

print_success "Installation guide created"
echo ""

################################################################################
# 10. Create Package Summary
################################################################################
print_header "Creating Package Summary"

cat > PACKAGE_SUMMARY.txt << EOF
════════════════════════════════════════════════════════════════════════
NMS OFFLINE PACKAGE SUMMARY
════════════════════════════════════════════════════════════════════════

Package Created: $(date)
Created On: $(hostname)
Architecture: $(uname -m)

DOCKER IMAGES:
─────────────────────────────────────────────────────────────────────
$(docker images | grep -E "(postgres|nginx|node|nms)" | awk '{printf "%-40s %10s\n", $1":"$2, $7" "$8}')

FILE SIZES:
─────────────────────────────────────────────────────────────────────
$(ls -lh *.tar *.tar.gz *.xz 2>/dev/null | awk '{printf "%-50s %10s\n", $9, $5}')

TOTAL PACKAGE SIZE:
─────────────────────────────────────────────────────────────────────
$(du -sh . | cut -f1)

CHECKSUMS:
─────────────────────────────────────────────────────────────────────
See CHECKSUMS.txt for SHA256 checksums of all files.

INSTALLATION:
─────────────────────────────────────────────────────────────────────
See INSTALLATION.txt for complete installation instructions.

NEXT STEPS:
─────────────────────────────────────────────────────────────────────
1. Compress this directory:
   tar -czf nms-offline-package.tar.gz .

2. Transfer to offline machine via:
   - USB drive
   - Secure file transfer
   - Internal repository

3. Extract and follow INSTALLATION.txt

════════════════════════════════════════════════════════════════════════
EOF

print_success "Package summary created"
echo ""

################################################################################
# 11. Final Compression
################################################################################
print_header "Creating Final Package"

cd ..

print_warning "Compressing (this may take several minutes)..."
tar -czf "${PACKAGE_DIR}.tar.gz" "$PACKAGE_DIR"/ 2>&1 | grep -E "(added|^$)" || true

if [ -f "${PACKAGE_DIR}.tar.gz" ]; then
    print_success "Package created: ${PACKAGE_DIR}.tar.gz"
    print_success "Size: $(du -h ${PACKAGE_DIR}.tar.gz | cut -f1)"
else
    print_error "Failed to create final package"
    exit 1
fi

echo ""

################################################################################
# COMPLETE!
################################################################################
print_header "PACKAGE CREATION COMPLETE"

echo ""
echo -e "${GREEN}✓ Package: ${PACKAGE_DIR}.tar.gz${NC}"
echo -e "${GREEN}✓ Size: $(du -h ${PACKAGE_DIR}.tar.gz | cut -f1)${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Verify checksums: cd ${PACKAGE_DIR} && sha256sum -c CHECKSUMS.txt"
echo -e "  2. Transfer ${PACKAGE_DIR}.tar.gz to offline machine"
echo -e "  3. Extract: tar -xzf ${PACKAGE_DIR}.tar.gz"
echo -e "  4. Follow: ${PACKAGE_DIR}/INSTALLATION.txt"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo -e "  • INSTALLATION.txt     - Step-by-step installation guide"
echo -e "  • PACKAGE_SUMMARY.txt  - Package contents summary"
echo -e "  • CHECKSUMS.txt        - SHA256 checksums for verification"
echo ""
echo -e "${GREEN}🎉 Ready for offline deployment!${NC}"
echo ""
