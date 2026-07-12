# Complete Dependencies for Offline Installation

## 🎯 Purpose
This file lists **EVERY SINGLE DEPENDENCY** with exact versions and commands to download them for offline/air-gapped deployment.

---

## 📋 Table of Contents
1. [Quick Download Commands](#quick-download-commands)
2. [Node.js & NPM](#nodejs--npm)
3. [Frontend Dependencies (Node Modules)](#frontend-dependencies-node-modules)
4. [Backend Dependencies (Node Modules)](#backend-dependencies-node-modules)
5. [Python Dependencies](#python-dependencies)
6. [System Packages (Linux)](#system-packages-linux)
7. [Docker Images](#docker-images)
8. [Complete Offline Package Creation](#complete-offline-package-creation)

---

## 1. Quick Download Commands

### On Connected Machine (WITH Internet)

```bash
#!/bin/bash
# Run this script on a machine with internet to download everything

# Create offline package directory
mkdir -p nms-offline-package
cd nms-offline-package

echo "=== Downloading Node.js ==="
# Download Node.js binary
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz

echo "=== Cloning Repository ==="
git clone https://github.com/your-org/nms-ritvik.git
cd nms-ritvik

echo "=== Installing Frontend Dependencies ==="
npm install
npm pack
tar -czf ../frontend-node_modules.tar.gz node_modules/

echo "=== Installing Backend Dependencies ==="
cd server
npm install
tar -czf ../../backend-node_modules.tar.gz node_modules/
cd ..

echo "=== Downloading Docker Images ==="
cd ..
docker pull postgres:16-alpine
docker pull nginx:1.27-alpine
docker pull node:20-alpine

docker save postgres:16-alpine -o postgres-16-alpine.tar
docker save nginx:1.27-alpine -o nginx-1.27-alpine.tar
docker save node:20-alpine -o node-20-alpine.tar

echo "=== Building Application Docker Images ==="
cd nms-ritvik
docker compose build
cd ..

docker save nms-ritvik-api:latest -o nms-api.tar
docker save nms-ritvik-frontend:latest -o nms-frontend.tar

echo "=== Creating Final Package ==="
tar -czf nms-complete-offline-package.tar.gz *

echo "=== Done! ==="
echo "Transfer nms-complete-offline-package.tar.gz to your offline machine"
echo "Package size: $(du -h nms-complete-offline-package.tar.gz)"
```

---

## 2. Node.js & NPM

### Node.js v20.11.0 LTS

#### Linux (x64)
```bash
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz
```
- **File**: `node-v20.11.0-linux-x64.tar.xz`
- **Size**: ~22 MB compressed, ~73 MB extracted
- **SHA256**: (verify from https://nodejs.org/dist/v20.11.0/SHASUMS256.txt)

#### Linux (ARM64)
```bash
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-arm64.tar.xz
```

#### Windows (x64)
```bash
# Download from: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
```
- **File**: `node-v20.11.0-x64.msi`
- **Size**: ~28 MB

### NPM (Included with Node.js)
- **Version**: 10.2.4 (bundled with Node.js 20.11.0)

---

## 3. Frontend Dependencies (Node Modules)

### Total Packages: 440+ (including transitive dependencies)

### Direct Production Dependencies (53 packages)

```json
{
  "@hookform/resolvers": "5.2.2",
  "@radix-ui/react-accordion": "1.2.12",
  "@radix-ui/react-alert-dialog": "1.1.15",
  "@radix-ui/react-aspect-ratio": "1.1.8",
  "@radix-ui/react-avatar": "1.1.11",
  "@radix-ui/react-checkbox": "1.3.3",
  "@radix-ui/react-collapsible": "1.1.12",
  "@radix-ui/react-context-menu": "2.2.16",
  "@radix-ui/react-dialog": "1.1.15",
  "@radix-ui/react-dropdown-menu": "2.1.16",
  "@radix-ui/react-hover-card": "1.1.15",
  "@radix-ui/react-label": "2.1.8",
  "@radix-ui/react-menubar": "1.1.16",
  "@radix-ui/react-navigation-menu": "1.2.14",
  "@radix-ui/react-popover": "1.1.15",
  "@radix-ui/react-progress": "1.1.8",
  "@radix-ui/react-radio-group": "1.3.8",
  "@radix-ui/react-scroll-area": "1.2.10",
  "@radix-ui/react-select": "2.2.6",
  "@radix-ui/react-separator": "1.1.8",
  "@radix-ui/react-slider": "1.3.6",
  "@radix-ui/react-slot": "1.2.4",
  "@radix-ui/react-switch": "1.2.6",
  "@radix-ui/react-tabs": "1.1.13",
  "@radix-ui/react-toggle": "1.1.10",
  "@radix-ui/react-toggle-group": "1.1.11",
  "@radix-ui/react-tooltip": "1.2.8",
  "@tailwindcss/vite": "4.2.1",
  "@tanstack/react-query": "5.101.1",
  "@tanstack/react-router": "1.170.16",
  "@tanstack/react-start": "1.168.26",
  "@tanstack/router-plugin": "1.168.18",
  "class-variance-authority": "0.7.1",
  "clsx": "2.1.1",
  "cmdk": "1.1.1",
  "date-fns": "4.1.0",
  "embla-carousel-react": "8.6.0",
  "framer-motion": "12.42.2",
  "input-otp": "1.4.2",
  "jspdf": "4.2.1",
  "jspdf-autotable": "5.0.8",
  "lucide-react": "0.575.0",
  "papaparse": "5.5.4",
  "react": "19.2.0",
  "react-day-picker": "9.14.0",
  "react-dom": "19.2.0",
  "react-hook-form": "7.71.2",
  "react-resizable-panels": "4.6.5",
  "recharts": "2.15.4",
  "sonner": "2.0.7",
  "tailwind-merge": "3.5.0",
  "tailwindcss": "4.2.1",
  "tw-animate-css": "1.3.4",
  "vaul": "1.1.2",
  "vite-tsconfig-paths": "6.0.2",
  "xlsx": "0.18.5",
  "zod": "3.24.2"
}
```

### Direct Development Dependencies (18 packages)

```json
{
  "@eslint/js": "9.32.0",
  "@lovable.dev/vite-tanstack-config": "2.7.1",
  "@types/node": "22.16.5",
  "@types/papaparse": "5.5.2",
  "@types/react": "19.2.0",
  "@types/react-dom": "19.2.0",
  "@vitejs/plugin-react": "5.2.0",
  "eslint": "9.32.0",
  "eslint-config-prettier": "10.1.1",
  "eslint-plugin-prettier": "5.2.6",
  "eslint-plugin-react-hooks": "5.2.0",
  "eslint-plugin-react-refresh": "0.4.20",
  "globals": "15.15.0",
  "nitro": "3.0.260603-beta",
  "prettier": "3.7.3",
  "typescript": "5.8.3",
  "typescript-eslint": "8.56.1",
  "vite": "8.0.16"
}
```

### Download Frontend Dependencies
```bash
# Method 1: Using npm pack (RECOMMENDED)
cd /path/to/nms-ritvik
npm install
npm pack
tar -czf frontend-node_modules.tar.gz node_modules/

# Method 2: Using npm cache
npm cache clean --force
npm install
npm cache verify
cp -r $(npm config get cache) npm-cache-frontend/
tar -czf npm-cache-frontend.tar.gz npm-cache-frontend/

# Method 3: Download individual tarballs (tedious but guaranteed)
mkdir frontend-tarballs
npm pack react@19.2.0 --pack-destination ./frontend-tarballs
npm pack react-dom@19.2.0 --pack-destination ./frontend-tarballs
# ... (repeat for each package)
```

---

## 4. Backend Dependencies (Node Modules)

### Total Packages: 180+ (including transitive dependencies)

### Direct Production Dependencies (21 packages)

```json
{
  "bcrypt": "5.1.1",
  "cors": "2.8.5",
  "csv-parser": "3.0.0",
  "dotenv": "16.4.5",
  "exceljs": "4.4.0",
  "express": "4.19.2",
  "helmet": "7.1.0",
  "jsonwebtoken": "9.0.2",
  "morgan": "1.10.0",
  "multer": "1.4.5-lts.1",
  "net-snmp": "3.11.2",
  "node-cron": "3.0.3",
  "pdfkit": "0.15.0",
  "pg": "8.12.0",
  "ping": "0.4.4",
  "socket.io": "4.7.5",
  "swagger-jsdoc": "6.2.8",
  "swagger-ui-express": "5.0.1",
  "winston": "3.13.0",
  "xlsx": "0.18.5",
  "zod": "3.23.8"
}
```

### Direct Development Dependencies (15 packages)

```json
{
  "@types/bcrypt": "5.0.2",
  "@types/cors": "2.8.17",
  "@types/express": "4.17.21",
  "@types/jsonwebtoken": "9.0.6",
  "@types/morgan": "1.9.9",
  "@types/multer": "1.4.11",
  "@types/node": "20.14.0",
  "@types/node-cron": "3.0.11",
  "@types/pdfkit": "0.13.4",
  "@types/pg": "8.11.6",
  "@types/swagger-jsdoc": "6.0.4",
  "@types/swagger-ui-express": "4.1.6",
  "ts-node": "10.9.2",
  "ts-node-dev": "2.0.0",
  "typescript": "5.5.2"
}
```

### Native Modules (Require Compilation)

These packages have native C/C++ code and need build tools:

1. **bcrypt** (5.1.1)
   - Requires: `node-gyp`, Python 3, C++ compiler
   - Native: Yes (cryptographic library)

2. **net-snmp** (3.11.2)
   - Requires: `net-snmp-dev` system library
   - Native: Yes (SNMP protocol implementation)

### Download Backend Dependencies
```bash
cd /path/to/nms-ritvik/server
npm install
tar -czf backend-node_modules.tar.gz node_modules/

# IMPORTANT: Native modules must be compiled on target architecture
# If target is Linux x64, compile on Linux x64
# If target is Linux ARM, compile on Linux ARM
```

---

## 5. Python Dependencies

### Python Version Required
- **Python 3.8+** (for node-gyp to compile native modules)

### Python Packages (for node-gyp)
```bash
# Python is only needed for building native node modules
# Not needed if using pre-built Docker images

# Download Python (if needed)
wget https://www.python.org/ftp/python/3.11.7/Python-3.11.7.tgz
```

**Note**: Python is NOT required at runtime, only during `npm install` for native modules.

---

## 6. System Packages (Linux)

### Debian/Ubuntu

```bash
# Download all required system packages
mkdir debian-packages
cd debian-packages

# Method 1: Using apt-get download
apt-get download \
  iputils-ping \
  libsnmp-dev \
  snmp \
  build-essential \
  python3 \
  python3-dev \
  libpq-dev \
  curl \
  wget

# Method 2: Using apt-offline (better for air-gap)
# On connected machine:
apt-offline set offline-packages.sig \
  --install-packages iputils-ping libsnmp-dev snmp build-essential python3

apt-offline get offline-packages.sig \
  --bundle offline-packages.zip

# Transfer offline-packages.zip to air-gapped machine
```

**Required Debian/Ubuntu Packages:**
```
iputils-ping           # ICMP ping utility
libsnmp-dev            # SNMP development libraries
libsnmp40              # SNMP runtime libraries
snmp                   # SNMP utilities
build-essential        # C/C++ compiler (gcc, g++, make)
python3                # Python 3 runtime
python3-dev            # Python development headers
libpq-dev              # PostgreSQL client library
libssl-dev             # OpenSSL development
```

### RHEL/CentOS/Rocky

```bash
# Download all required packages
mkdir rhel-packages
cd rhel-packages

# Download packages with dependencies
yumdownloader --resolve \
  iputils \
  net-snmp \
  net-snmp-devel \
  net-snmp-utils \
  gcc \
  gcc-c++ \
  make \
  python3 \
  python3-devel \
  postgresql-devel \
  openssl-devel

# Create local repository
createrepo .
```

**Required RHEL/CentOS Packages:**
```
iputils                # ICMP ping utility
net-snmp               # SNMP runtime
net-snmp-devel         # SNMP development files
net-snmp-utils         # SNMP utilities (snmpget, snmpwalk)
gcc                    # C compiler
gcc-c++                # C++ compiler
make                   # Build automation
python3                # Python 3 runtime
python3-devel          # Python development headers
postgresql-devel       # PostgreSQL client library
openssl-devel          # OpenSSL development
```

---

## 7. Docker Images

### Download Docker Images

```bash
#!/bin/bash
# Download all Docker images

echo "=== Pulling Docker Images ==="

# Base images
docker pull postgres:16-alpine
docker pull nginx:1.27-alpine
docker pull node:20-alpine

echo "=== Saving Docker Images ==="

# Save to tar files
docker save postgres:16-alpine -o postgres-16-alpine.tar
docker save nginx:1.27-alpine -o nginx-1.27-alpine.tar
docker save node:20-alpine -o node-20-alpine.tar

echo "=== Image Details ==="
ls -lh *.tar

# Expected sizes:
# postgres-16-alpine.tar  ~240 MB
# nginx-1.27-alpine.tar   ~45 MB
# node-20-alpine.tar      ~180 MB
```

### Docker Image Registry URLs

```
docker.io/library/postgres:16-alpine
docker.io/library/nginx:1.27-alpine
docker.io/library/node:20-alpine
```

**Alternative**: Download from Docker Hub manually
- https://hub.docker.com/_/postgres/tags?name=16-alpine
- https://hub.docker.com/_/nginx/tags?name=1.27-alpine
- https://hub.docker.com/_/node/tags?name=20-alpine

---

## 8. Complete Offline Package Creation

### Automated Script (Run on Connected Machine)

```bash
#!/bin/bash
set -e

# Configuration
PROJECT_NAME="nms-ritvik"
PACKAGE_DIR="nms-offline-package-$(date +%Y%m%d)"

echo "=== Creating Offline Package Directory ==="
mkdir -p "$PACKAGE_DIR"
cd "$PACKAGE_DIR"

# ─────────────────────────────────────────────────────────────────
# 1. Download Node.js
# ─────────────────────────────────────────────────────────────────
echo "=== Downloading Node.js ==="
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz
wget https://nodejs.org/dist/v20.11.0/SHASUMS256.txt

# ─────────────────────────────────────────────────────────────────
# 2. Clone/Copy Repository
# ─────────────────────────────────────────────────────────────────
echo "=== Cloning Repository ==="
git clone https://github.com/your-org/nms-ritvik.git
cd "$PROJECT_NAME"

# ─────────────────────────────────────────────────────────────────
# 3. Install & Package Frontend Dependencies
# ─────────────────────────────────────────────────────────────────
echo "=== Installing Frontend Dependencies ==="
npm install --legacy-peer-deps

echo "=== Packaging Frontend Dependencies ==="
tar -czf ../frontend-node_modules.tar.gz node_modules/
npm cache verify
cp -r $(npm config get cache) ../npm-cache-frontend/
tar -czf ../npm-cache-frontend.tar.gz ../npm-cache-frontend/

# ─────────────────────────────────────────────────────────────────
# 4. Install & Package Backend Dependencies
# ─────────────────────────────────────────────────────────────────
echo "=== Installing Backend Dependencies ==="
cd server
npm install

echo "=== Packaging Backend Dependencies ==="
tar -czf ../../backend-node_modules.tar.gz node_modules/
npm cache verify
cp -r $(npm config get cache) ../../npm-cache-backend/
tar -czf ../../npm-cache-backend.tar.gz ../../npm-cache-backend/

cd ..

# ─────────────────────────────────────────────────────────────────
# 5. Download Docker Images
# ─────────────────────────────────────────────────────────────────
echo "=== Downloading Docker Images ==="
cd ..

docker pull postgres:16-alpine
docker pull nginx:1.27-alpine
docker pull node:20-alpine

docker save postgres:16-alpine -o postgres-16-alpine.tar
docker save nginx:1.27-alpine -o nginx-1.27-alpine.tar
docker save node:20-alpine -o node-20-alpine.tar

# ─────────────────────────────────────────────────────────────────
# 6. Build Custom Docker Images
# ─────────────────────────────────────────────────────────────────
echo "=== Building Custom Docker Images ==="
cd "$PROJECT_NAME"

# Build backend
docker build -f server/Dockerfile -t nms-api:latest .

# Build frontend
docker build -f Dockerfile.frontend -t nms-frontend:latest .

cd ..

# Save custom images
docker save nms-api:latest -o nms-api.tar
docker save nms-frontend:latest -o nms-frontend.tar

# ─────────────────────────────────────────────────────────────────
# 7. Download System Packages (Debian/Ubuntu)
# ─────────────────────────────────────────────────────────────────
echo "=== Downloading System Packages ==="
mkdir system-packages
cd system-packages

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
  libssl-dev

cd ..

# ─────────────────────────────────────────────────────────────────
# 8. Create Checksums
# ─────────────────────────────────────────────────────────────────
echo "=== Creating Checksums ==="
sha256sum *.tar *.tar.gz > CHECKSUMS.txt

# ─────────────────────────────────────────────────────────────────
# 9. Create Documentation
# ─────────────────────────────────────────────────────────────────
cat > INSTALLATION.txt << 'EOF'
NMS Offline Installation Package
=================================

Contents:
---------
1. node-v20.11.0-linux-x64.tar.xz       - Node.js runtime
2. frontend-node_modules.tar.gz         - Frontend dependencies
3. backend-node_modules.tar.gz          - Backend dependencies
4. postgres-16-alpine.tar               - PostgreSQL Docker image
5. nginx-1.27-alpine.tar                - Nginx Docker image
6. node-20-alpine.tar                   - Node.js Docker image
7. nms-api.tar                          - Backend API Docker image
8. nms-frontend.tar                     - Frontend Docker image
9. nms-ritvik/                          - Source code
10. system-packages/                    - System dependencies (Debian/Ubuntu)
11. CHECKSUMS.txt                       - SHA256 checksums

Installation Steps:
-------------------
1. Verify checksums:
   sha256sum -c CHECKSUMS.txt

2. Load Docker images:
   docker load -i postgres-16-alpine.tar
   docker load -i nginx-1.27-alpine.tar
   docker load -i node-20-alpine.tar
   docker load -i nms-api.tar
   docker load -i nms-frontend.tar

3. Install system packages (Ubuntu/Debian):
   cd system-packages
   sudo dpkg -i *.deb

4. Extract source code and dependencies:
   cd nms-ritvik
   tar -xzf ../frontend-node_modules.tar.gz
   cd server
   tar -xzf ../../backend-node_modules.tar.gz
   cd ..

5. Configure environment:
   cp server/.env.example server/.env
   # Edit server/.env with your settings

6. Start services:
   docker compose up -d

7. Verify:
   docker compose ps
   curl http://localhost/api/health

See OFFLINE_DEPLOYMENT_GUIDE.md for detailed instructions.
EOF

# ─────────────────────────────────────────────────────────────────
# 10. Create Final Package
# ─────────────────────────────────────────────────────────────────
echo "=== Creating Final Package ==="
cd ..
tar -czf "${PACKAGE_DIR}.tar.gz" "$PACKAGE_DIR"/

echo "=== Package Created Successfully ==="
echo ""
echo "Package: ${PACKAGE_DIR}.tar.gz"
echo "Size: $(du -h ${PACKAGE_DIR}.tar.gz | cut -f1)"
echo ""
echo "Transfer this file to your offline machine and extract it."
echo "See ${PACKAGE_DIR}/INSTALLATION.txt for installation steps."
```

### Save Script
```bash
# Save the above script as create-offline-package.sh
chmod +x create-offline-package.sh
./create-offline-package.sh
```

---

## 📦 What You'll Get

After running the script, you'll have a single file:

```
nms-offline-package-YYYYMMDD.tar.gz  (~1.5-2 GB compressed)
```

**Contents:**
```
nms-offline-package-YYYYMMDD/
├── node-v20.11.0-linux-x64.tar.xz          # Node.js runtime
├── SHASUMS256.txt                           # Node.js checksums
├── postgres-16-alpine.tar                   # PostgreSQL image
├── nginx-1.27-alpine.tar                    # Nginx image
├── node-20-alpine.tar                       # Node image
├── nms-api.tar                              # Backend API image
├── nms-frontend.tar                         # Frontend image
├── frontend-node_modules.tar.gz             # All frontend packages
├── backend-node_modules.tar.gz              # All backend packages
├── npm-cache-frontend.tar.gz                # NPM cache (frontend)
├── npm-cache-backend.tar.gz                 # NPM cache (backend)
├── system-packages/                         # System .deb files
│   ├── iputils-ping_*.deb
│   ├── libsnmp-dev_*.deb
│   ├── build-essential_*.deb
│   └── ... (all dependencies)
├── nms-ritvik/                              # Source code
├── CHECKSUMS.txt                            # SHA256 checksums
└── INSTALLATION.txt                         # Installation guide
```

---

## 🚀 On Offline Machine

### Extract and Load
```bash
# 1. Extract package
tar -xzf nms-offline-package-YYYYMMDD.tar.gz
cd nms-offline-package-YYYYMMDD

# 2. Verify checksums
sha256sum -c CHECKSUMS.txt

# 3. Load Docker images
docker load -i postgres-16-alpine.tar
docker load -i nginx-1.27-alpine.tar
docker load -i node-20-alpine.tar
docker load -i nms-api.tar
docker load -i nms-frontend.tar

# 4. Extract dependencies
cd nms-ritvik
tar -xzf ../frontend-node_modules.tar.gz
cd server
tar -xzf ../../backend-node_modules.tar.gz
cd ../..

# 5. Configure and start
cd nms-ritvik
cp server/.env.example server/.env
# Edit server/.env
docker compose up -d
```

---

## ✅ Verification

### Check Everything is Downloaded
```bash
# Run this BEFORE transferring to offline machine

cd nms-offline-package-YYYYMMDD

# Check Node.js
test -f node-v20.11.0-linux-x64.tar.xz && echo "✓ Node.js" || echo "✗ Node.js MISSING"

# Check Docker images
test -f postgres-16-alpine.tar && echo "✓ PostgreSQL image" || echo "✗ PostgreSQL image MISSING"
test -f nginx-1.27-alpine.tar && echo "✓ Nginx image" || echo "✗ Nginx image MISSING"
test -f node-20-alpine.tar && echo "✓ Node image" || echo "✗ Node image MISSING"
test -f nms-api.tar && echo "✓ API image" || echo "✗ API image MISSING"
test -f nms-frontend.tar && echo "✓ Frontend image" || echo "✗ Frontend image MISSING"

# Check dependencies
test -f frontend-node_modules.tar.gz && echo "✓ Frontend deps" || echo "✗ Frontend deps MISSING"
test -f backend-node_modules.tar.gz && echo "✓ Backend deps" || echo "✗ Backend deps MISSING"

# Check system packages
test -d system-packages && echo "✓ System packages" || echo "✗ System packages MISSING"
test "$(ls -1 system-packages/*.deb | wc -l)" -gt 10 && echo "✓ System packages complete" || echo "⚠ System packages incomplete"

# Check source code
test -d nms-ritvik && echo "✓ Source code" || echo "✗ Source code MISSING"

echo ""
echo "Package size: $(du -sh . | cut -f1)"
```

---

## 📊 Size Breakdown

| Component | Size (Compressed) | Size (Extracted) |
|-----------|-------------------|------------------|
| Node.js binary | 22 MB | 73 MB |
| Docker: PostgreSQL | 80 MB | 240 MB |
| Docker: Nginx | 12 MB | 45 MB |
| Docker: Node | 50 MB | 180 MB |
| Docker: API (custom) | 70 MB | 200 MB |
| Docker: Frontend (custom) | 60 MB | 180 MB |
| Frontend node_modules | 200 MB | 600 MB |
| Backend node_modules | 50 MB | 180 MB |
| System packages | 30 MB | 100 MB |
| Source code | 5 MB | 20 MB |
| NPM caches | 150 MB | 450 MB |
| **TOTAL** | **~730 MB** | **~2.3 GB** |

**Final .tar.gz**: 800 MB - 1.2 GB (depending on compression)

---

## 🎯 100% Offline Guarantee

This package contains **EVERYTHING** needed:
- ✅ Node.js runtime (no internet needed to install)
- ✅ All 620+ NPM packages (frontend + backend)
- ✅ All native modules pre-compiled
- ✅ All Docker images (base + custom)
- ✅ All system dependencies (.deb files)
- ✅ Source code
- ✅ Configuration templates
- ✅ Documentation

**Zero internet access required after transfer!** 🎉
