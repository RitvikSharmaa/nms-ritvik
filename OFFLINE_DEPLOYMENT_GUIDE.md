# Offline Air-Gapped Deployment Guide

## 🎯 Purpose
This document lists ALL dependencies, software, and resources required to deploy the Enterprise NMS in a **completely offline, air-gapped environment** with **ZERO internet access**.

---

## 📋 Table of Contents
1. [System Requirements](#system-requirements)
2. [Base Software Dependencies](#base-software-dependencies)
3. [Docker Images](#docker-images)
4. [NPM Packages - Frontend](#npm-packages---frontend)
5. [NPM Packages - Backend](#npm-packages---backend)
6. [System Binaries](#system-binaries)
7. [Preparation Steps (Connected Environment)](#preparation-steps-connected-environment)
8. [Transfer to Air-Gapped Environment](#transfer-to-air-gapped-environment)
9. [Deployment in Air-Gapped Environment](#deployment-in-air-gapped-environment)
10. [Verification Checklist](#verification-checklist)

---

## 1. System Requirements

### Hardware
- **CPU**: 4 cores minimum (8 cores recommended for 500+ devices)
- **RAM**: 8GB minimum (16GB recommended for 500+ devices)
- **Storage**: 100GB minimum (500GB recommended for long-term metrics storage)
- **Network**: Ethernet interface with access to monitored network

### Operating System (Any of these)
- **Linux**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+ / Debian 11+
- **Windows Server**: 2019+ (with Docker Desktop or WSL2)
- **macOS**: 11+ (for development/testing only)

### Required Privileges
- Root/Administrator access for Docker installation
- `NET_RAW` capability for ICMP (ping) operations
- Port 80 access for HTTP server

---

## 2. Base Software Dependencies

### Docker Engine
- **Version**: 20.10.0 or higher
- **Components**:
  - Docker daemon (`dockerd`)
  - Docker CLI (`docker`)
  - Docker Compose V2 (`docker compose`)
- **Installation Files**:
  - Linux: `docker-ce`, `docker-ce-cli`, `containerd.io`
  - Windows: `Docker Desktop Installer.exe`

### Node.js (for building, not runtime)
- **Version**: 20.x LTS
- **Required for**: Building frontend and backend before Docker
- **Components**:
  - `node` binary
  - `npm` package manager
- **Download**: https://nodejs.org/dist/v20.11.0/

### Git (optional, for version control)
- **Version**: 2.30.0 or higher
- **Required for**: Cloning repository
- **Alternative**: Download ZIP from repository

---

## 3. Docker Images

### Required Base Images

#### PostgreSQL Database
```yaml
Image: postgres:16-alpine
Size: ~80MB compressed, ~240MB uncompressed
Registry: docker.io/library/postgres
Tag: 16-alpine
```

#### Nginx Web Server
```yaml
Image: nginx:1.27-alpine
Size: ~12MB compressed, ~45MB uncompressed
Registry: docker.io/library/nginx
Tag: 1.27-alpine
```

#### Node.js (for building custom images)
```yaml
Image: node:20-alpine
Size: ~50MB compressed, ~180MB uncompressed
Registry: docker.io/library/node
Tag: 20-alpine
```

### Custom Application Images (built from Dockerfiles)

#### Backend API
```dockerfile
# Built from: server/Dockerfile
Base Image: node:20-alpine
Final Size: ~200MB
Includes:
  - Compiled TypeScript (dist/)
  - Node modules (node_modules/)
  - System dependencies (ping, net-snmp)
```

#### Frontend Application
```dockerfile
# Built from: Dockerfile.frontend
Base Image: node:20-alpine
Final Size: ~180MB
Includes:
  - Built static assets
  - TanStack Start SSR server
  - Node modules
```

---

## 4. NPM Packages - Frontend

### Production Dependencies (85 packages)
Located in: `package.json`

#### Core Framework
```json
{
  "react": "^19.2.0",                      // React library
  "react-dom": "^19.2.0",                  // React DOM renderer
  "@tanstack/react-router": "^1.170.16",  // File-based routing
  "@tanstack/react-query": "^5.101.1",    // Server state management
  "@tanstack/react-start": "^1.168.26"    // SSR framework
}
```

#### UI Components (Radix UI)
```json
{
  "@radix-ui/react-accordion": "^1.2.12",
  "@radix-ui/react-alert-dialog": "^1.1.15",
  "@radix-ui/react-avatar": "^1.1.11",
  "@radix-ui/react-checkbox": "^1.3.3",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-label": "^2.1.8",
  "@radix-ui/react-popover": "^1.1.15",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-separator": "^1.1.8",
  "@radix-ui/react-slider": "^1.3.6",
  "@radix-ui/react-switch": "^1.2.6",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-tooltip": "^1.2.8",
  // ... (15+ more Radix components)
}
```

#### Styling
```json
{
  "tailwindcss": "^4.2.1",                 // Utility-first CSS
  "@tailwindcss/vite": "^4.2.1",          // Vite integration
  "tailwind-merge": "^3.5.0",             // Class merging utility
  "class-variance-authority": "^0.7.1",   // Variant helper
  "clsx": "^2.1.1"                        // Conditional classes
}
```

#### Data Visualization
```json
{
  "recharts": "^2.15.4"                    // Chart library
}
```

#### Forms & Validation
```json
{
  "react-hook-form": "^7.71.2",           // Form state management
  "@hookform/resolvers": "^5.2.2",        // Validation resolver
  "zod": "^3.24.2"                        // Schema validation
}
```

#### File Handling
```json
{
  "papaparse": "^5.5.4",                  // CSV parser
  "xlsx": "^0.18.5"                       // Excel parser
}
```

#### PDF Generation
```json
{
  "jspdf": "^4.2.1",                      // PDF library
  "jspdf-autotable": "^5.0.8"            // Table plugin
}
```

#### Animation & UI Polish
```json
{
  "framer-motion": "^12.42.2",            // Animations
  "sonner": "^2.0.7",                     // Toast notifications
  "lucide-react": "^0.575.0"              // Icon library
}
```

#### Utilities
```json
{
  "date-fns": "^4.1.0",                   // Date utilities
  "embla-carousel-react": "^8.6.0",       // Carousel component
  "cmdk": "^1.1.1",                       // Command menu
  "vaul": "^1.1.2",                       // Drawer component
  "react-day-picker": "^9.14.0",          // Date picker
  "react-resizable-panels": "^4.6.5",     // Resizable layouts
  "input-otp": "^1.4.2"                   // OTP input
}
```

### Development Dependencies (20 packages)
```json
{
  "@types/react": "^19.2.0",
  "@types/react-dom": "^19.2.0",
  "@types/papaparse": "^5.5.2",
  "typescript": "^5.8.3",
  "vite": "^8.0.16",
  "@vitejs/plugin-react": "^5.2.0",
  "eslint": "^9.32.0",
  "prettier": "^3.7.3",
  // ... (TypeScript, linting, build tools)
}
```

**Total Frontend Packages**: ~440 packages (including transitive dependencies)

---

## 5. NPM Packages - Backend

### Production Dependencies (25 packages)
Located in: `server/package.json`

#### Core Framework
```json
{
  "express": "^4.19.2",                   // Web framework
  "dotenv": "^16.4.5"                     // Environment variables
}
```

#### Database
```json
{
  "pg": "^8.12.0"                         // PostgreSQL client
}
```

#### Authentication & Security
```json
{
  "bcrypt": "^5.1.1",                     // Password hashing
  "jsonwebtoken": "^9.0.2",               // JWT tokens
  "helmet": "^7.1.0",                     // Security headers
  "cors": "^2.8.5"                        // CORS middleware
}
```

#### Validation
```json
{
  "zod": "^3.23.8"                        // Schema validation
}
```

#### Monitoring Engine
```json
{
  "node-cron": "^3.0.3",                  // Cron scheduler
  "ping": "^0.4.4",                       // ICMP probe
  "net-snmp": "^3.11.2"                   // SNMP client
}
```

#### Real-time Communication
```json
{
  "socket.io": "^4.7.5"                   // WebSocket server
}
```

#### File Upload & Parsing
```json
{
  "multer": "^1.4.5-lts.1",              // File upload handler
  "csv-parser": "^3.0.0",                 // CSV parsing
  "xlsx": "^0.18.5"                       // Excel parsing
}
```

#### Report Generation
```json
{
  "pdfkit": "^0.15.0",                    // PDF generation
  "exceljs": "^4.4.0"                     // Excel generation
}
```

#### Logging
```json
{
  "winston": "^3.13.0",                   // Logger
  "morgan": "^1.10.0"                     // HTTP logger
}
```

#### API Documentation
```json
{
  "swagger-jsdoc": "^6.2.8",              // Swagger spec generator
  "swagger-ui-express": "^5.0.1"          // Swagger UI
}
```

### Development Dependencies (12 packages)
```json
{
  "@types/node": "^20.14.0",
  "@types/express": "^4.17.21",
  "@types/bcrypt": "^5.0.2",
  "@types/jsonwebtoken": "^9.0.6",
  "@types/pg": "^8.11.6",
  "@types/node-cron": "^3.0.11",
  "typescript": "^5.5.2",
  "ts-node": "^10.9.2",
  "ts-node-dev": "^2.0.0"
  // ... (TypeScript types)
}
```

**Total Backend Packages**: ~180 packages (including transitive dependencies)

---

## 6. System Binaries

### Required System Commands

#### Linux (Debian/Ubuntu)
```bash
# ICMP (ping) - Usually pre-installed
apt-get install -y iputils-ping

# Net-SNMP development libraries (for net-snmp npm package)
apt-get install -y libsnmp-dev snmp

# Build tools (for native npm modules)
apt-get install -y build-essential python3

# Optional: Network debugging tools
apt-get install -y net-tools iproute2 tcpdump
```

#### Linux (RHEL/CentOS)
```bash
# ICMP (ping)
yum install -y iputils

# Net-SNMP libraries
yum install -y net-snmp net-snmp-devel net-snmp-utils

# Build tools
yum groupinstall -y "Development Tools"
yum install -y python3
```

#### Windows
```powershell
# Ping is built-in (ICMP.exe)
# No additional binaries needed for Docker deployment
# For native development: Visual Studio Build Tools
```

---

## 7. Preparation Steps (Connected Environment)

### Step 1: Clone Repository
```bash
# On a machine WITH internet access
git clone https://github.com/your-org/nms-ritvik.git
cd nms-ritvik
```

### Step 2: Download Docker Base Images
```bash
# Pull all required Docker images
docker pull postgres:16-alpine
docker pull nginx:1.27-alpine
docker pull node:20-alpine

# Save images to tar files
docker save postgres:16-alpine -o postgres-16-alpine.tar
docker save nginx:1.27-alpine -o nginx-1.27-alpine.tar
docker save node:20-alpine -o node-20-alpine.tar

# Verify files created
ls -lh *.tar
```

### Step 3: Install NPM Dependencies (Frontend)
```bash
# Install all frontend dependencies
npm install

# Create offline npm cache
npm pack --pack-destination ./offline-cache
npm cache verify

# Bundle node_modules for transfer
tar -czf frontend-node_modules.tar.gz node_modules/
```

### Step 4: Install NPM Dependencies (Backend)
```bash
cd server

# Install all backend dependencies
npm install

# Bundle node_modules for transfer
tar -czf backend-node_modules.tar.gz node_modules/

cd ..
```

### Step 5: Build Docker Images
```bash
# Build custom images (includes all dependencies)
docker compose build

# Save custom images
docker save nms-ritvik-api:latest -o nms-api.tar
docker save nms-ritvik-frontend:latest -o nms-frontend.tar

# Verify all image files
ls -lh *.tar
```

### Step 6: Bundle Everything for Transfer
```bash
# Create deployment package
mkdir nms-deployment-package
cp -r . nms-deployment-package/
cp *.tar nms-deployment-package/

# Create single archive
tar -czf nms-complete-deployment.tar.gz nms-deployment-package/

# Final package size: ~500MB-1GB compressed
```

---

## 8. Transfer to Air-Gapped Environment

### Transfer Methods (Choose One)

#### Method 1: Physical Media (Most Secure)
```bash
# Copy to USB drive, external HDD, or DVD
# Requirements:
# - USB 3.0 drive (2GB+ capacity)
# - Read/write permissions
# - Virus scanning on target network before use
```

#### Method 2: Secure File Transfer
```bash
# If there's a secure file transfer mechanism
scp nms-complete-deployment.tar.gz user@airgapped-server:/tmp/
```

#### Method 3: Internal Repository
```bash
# Transfer to internal artifact repository
# Then download from internal network
```

---

## 9. Deployment in Air-Gapped Environment

### Step 1: Extract Deployment Package
```bash
# On the air-gapped server
cd /opt
tar -xzf /tmp/nms-complete-deployment.tar.gz
cd nms-deployment-package
```

### Step 2: Load Docker Images
```bash
# Load all Docker images into local Docker
docker load -i postgres-16-alpine.tar
docker load -i nginx-1.27-alpine.tar
docker load -i node-20-alpine.tar
docker load -i nms-api.tar
docker load -i nms-frontend.tar

# Verify images loaded
docker images
```

### Step 3: Configure Environment
```bash
# Copy and edit environment file
cp server/.env.example server/.env

# Edit with your settings (use vi, nano, or any text editor)
vi server/.env
```

**Required .env Configuration:**
```bash
# Database
DATABASE_URL=postgres://nms:nms_secret@postgres:5432/nms

# Security (CHANGE THESE!)
JWT_SECRET=CHANGE_THIS_TO_RANDOM_64_CHAR_STRING
ADMIN_PASSWORD=CHANGE_THIS_TO_SECURE_PASSWORD

# SNMP (adjust for your network)
SNMP_COMMUNITY=public
SNMP_PORT=161

# Monitoring
POLL_INTERVAL_SECONDS=30
ICMP_PACKET_COUNT=4

# Networking
CORS_ORIGIN=http://localhost
```

### Step 4: Start Services
```bash
# Start all services
docker compose up -d

# Verify all containers running
docker compose ps

# Expected output:
# NAME                 STATUS
# nms-postgres         Up
# nms-api              Up (healthy)
# nms-frontend         Up
# nms-nginx            Up
```

### Step 5: Verify Database Initialization
```bash
# Check database migrations ran successfully
docker compose logs api | grep -i migration

# Should see:
# "Migrations completed successfully"
# "Admin user created"
```

### Step 6: Access Application
```bash
# Open web browser to:
http://localhost

# Or from another machine:
http://<server-ip>

# Default credentials:
# Username: admin
# Password: (whatever you set in ADMIN_PASSWORD)
```

---

## 10. Verification Checklist

### Docker Health Checks
```bash
# All containers should be "healthy" or "Up"
docker compose ps

# Check container logs
docker compose logs -f
```

### Database Connectivity
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U nms -d nms

# Verify tables exist
\dt

# Should see 17 tables:
# - users, roles, permissions, role_permissions
# - networks, links, devices, device_links
# - metrics, alerts, alert_history
# - uploads, reports, settings
# - audit_logs, notification_history, system_logs, health_checks

# Exit psql
\q
```

### API Health Check
```bash
# Check API health endpoint
curl http://localhost/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "pool": {
    "total": 20,
    "idle": 19,
    "waiting": 0
  },
  "monitoring": {
    "lastCycle": "2024-01-01T00:00:00.000Z",
    "deviceCount": 0
  }
}
```

### Swagger Documentation
```bash
# Access API documentation
# Browser: http://localhost/api/docs

# Should show interactive API documentation
```

### Frontend Access
```bash
# Browser: http://localhost
# Should load the dashboard with 5 network cards
# Simulation engine should run (56 devices visible)
```

### Monitoring Engine
```bash
# Check scheduler logs
docker compose logs api | grep "Monitoring cycle"

# Should see messages every 30 seconds:
# "Starting monitoring cycle: X devices"
# "Monitoring cycle complete: X devices in Yms"
```

### Network Connectivity Test
```bash
# Test ICMP from container
docker compose exec api ping -c 4 8.8.8.8

# Test SNMP (if you have SNMP-enabled devices)
docker compose exec api snmpget -v2c -c public <device-ip> sysDescr.0
```

---

## 📦 Complete Dependency List Summary

### Docker Images (5)
- ✅ `postgres:16-alpine` (~240MB)
- ✅ `nginx:1.27-alpine` (~45MB)
- ✅ `node:20-alpine` (~180MB)
- ✅ `nms-api:latest` (~200MB) - Custom built
- ✅ `nms-frontend:latest` (~180MB) - Custom built

### NPM Packages
- ✅ Frontend: ~440 packages
- ✅ Backend: ~180 packages
- ✅ Total: ~620 packages (all bundled in Docker images)

### System Binaries (Linux)
- ✅ `ping` (ICMP)
- ✅ `net-snmp` libraries
- ✅ `build-essential` (for native modules)
- ✅ `python3` (for node-gyp)

### Configuration Files
- ✅ `server/.env` (from .env.example)
- ✅ `docker-compose.yml` (included)
- ✅ `nginx/nginx.conf` (included)

### Total Package Size
- **Compressed**: ~800MB-1.2GB
- **Uncompressed**: ~2-3GB
- **Running Memory**: ~4-8GB (depends on device count)

---

## 🔒 Security Considerations for Air-Gap

### Pre-Transfer Scanning
```bash
# Scan all files for malware before transfer
clamscan -r nms-deployment-package/

# Verify checksums
sha256sum nms-complete-deployment.tar.gz > checksums.txt
```

### Post-Transfer Verification
```bash
# Verify checksum matches
sha256sum -c checksums.txt

# Inspect Docker images
docker inspect postgres:16-alpine
docker inspect nms-api:latest
```

### Hardening Steps
```bash
# Change default passwords
# Update JWT_SECRET to 64+ character random string
# Disable Swagger in production (if needed)
# Enable HTTPS (add TLS certificates to nginx)
# Restrict network access (firewall rules)
```

---

## 🆘 Troubleshooting

### Issue: Docker images won't load
```bash
# Check Docker daemon is running
sudo systemctl status docker

# Check file integrity
sha256sum postgres-16-alpine.tar

# Try loading with verbose output
docker load -i postgres-16-alpine.tar --verbose
```

### Issue: Containers won't start
```bash
# Check logs
docker compose logs api
docker compose logs postgres

# Common causes:
# - Port 80 already in use: Change ports in docker-compose.yml
# - Database not ready: Wait 30 seconds and retry
# - Permissions: Check file ownership and Docker socket access
```

### Issue: NET_RAW capability missing
```bash
# Add capability to API container
# In docker-compose.yml:
services:
  api:
    cap_add:
      - NET_RAW
```

### Issue: Can't ping devices
```bash
# Test from host
ping 192.168.1.1

# Test from container
docker compose exec api ping 192.168.1.1

# Check network connectivity
docker compose exec api ip route
```

---

## 📋 Pre-Transfer Checklist

Before transferring to air-gapped environment, verify you have:

- [ ] All 5 Docker image tar files (~845MB total)
- [ ] Complete source code with node_modules
- [ ] Configuration template (server/.env.example)
- [ ] This deployment guide
- [ ] Checksums file for verification
- [ ] Malware scan results (if required by policy)
- [ ] Transfer approval documentation (if required)

---

## 📞 Support Information

### Documentation Files (Included)
- `README.md` - Overview and quick start
- `ARCHITECTURE_AUDIT.md` - Complete system architecture
- `CODE_EXPLANATION.md` - Backend code walkthrough
- `FRONTEND_EXPLANATION.md` - Frontend code walkthrough
- `DATABASE_SCHEMA_REVIEW.md` - Database design details
- `MONITORING_ENGINE_IMPROVEMENTS.md` - Monitoring system details
- `OFFLINE_DEPLOYMENT_GUIDE.md` - This file

### Version Information
- **NMS Version**: 1.0.0
- **Last Updated**: 2024 (Check git tag for exact version)
- **Supported PostgreSQL**: 14+
- **Supported Docker**: 20.10+
- **Supported Node.js**: 20.x LTS

---

## ✅ Success Criteria

Your deployment is successful when:

1. ✅ All 5 Docker containers running (`docker compose ps`)
2. ✅ Database has 17 tables with seeds
3. ✅ API health check returns 200 OK
4. ✅ Frontend loads at http://localhost
5. ✅ Dashboard shows 5 network cards
6. ✅ Admin can log in
7. ✅ Monitoring cycle logs appear every 30 seconds
8. ✅ Devices can be uploaded via CSV/XLSX
9. ✅ Swagger docs accessible at /api/docs
10. ✅ No errors in `docker compose logs`

---

## 🎉 You're Done!

The system is now running completely offline with:
- ✅ No internet access required
- ✅ All dependencies bundled
- ✅ Production-ready configuration
- ✅ Monitoring 500-1000 devices
- ✅ Real-time updates via Socket.IO
- ✅ Complete API documentation

**Next Steps**: Upload your device inventory and configure alert thresholds!
