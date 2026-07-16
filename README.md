# Setu - Network Monitoring System

Real-time network monitoring with ICMP ping + SNMP polling.

## ✅ AIR-GAPPED PRODUCTION DEPLOYMENT

**This project is designed for COMPLETE air-gapped deployment.**

### Build on Windows → Deploy on Ubuntu 24 VM (No Internet)

**Single command to start:** `npm start`

### Quick Start

**On Windows (with internet):**
```cmd
REM 1. Install dependencies (one time)
npm install
cd server && npm install && cd ..

REM 2. Build production package
build-deployment.cmd

REM 3. Zip deployment/ folder
REM Transfer to Ubuntu VM
```

**On Ubuntu 24 VM (no internet):**
```bash
# 1. Unzip package
unzip nms-deployment.zip
cd nms-deployment/server

# 2. Setup PostgreSQL database
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE DATABASE nms; CREATE USER nms WITH PASSWORD 'nms_secret'; GRANT ALL PRIVILEGES ON DATABASE nms TO nms;"

# 3. Configure
cp .env.example .env
nano .env  # Change JWT_SECRET and ADMIN_PASSWORD

# 4. Run migrations
npm run migrate

# 5. Grant ICMP permission
sudo setcap cap_net_raw+ep $(which node)

# 6. Start application
npm start

# Access: http://localhost:4000
```

### What's Included

✓ **Compiled backend** (Express serves both API and frontend)
✓ **Built frontend** (React SPA as static files)
✓ **All 662 npm packages** (no npm install needed on VM)
✓ **Database migrations** (auto-creates 17 tables)
✓ **Complete offline operation** (zero internet dependency)

**Package size:** ~450 MB (zips to ~150-200 MB)

### Features
- ✅ ICMP ping monitoring (latency, packet loss)
- ✅ SNMP bandwidth monitoring
- ✅ Real-time dashboard with charts  
- ✅ Device management via CSV import
- ✅ Alert system
- ✅ Report generation (PDF/CSV/XLSX)
- ✅ User management with roles
- ✅ **Complete offline/air-gapped operation**
- ✅ **Single server deployment (Express serves API + frontend)**

### Architecture

```
Ubuntu 24 VM (Air-Gapped)
  │
  └─ Node.js Process (npm start)
      │
      ├─ Express Server (Port 4000)
      │   ├─ /api/*  → REST API
      │   ├─ /*      → Static files (React SPA)
      │   ├─ WebSocket Server
      │   └─ Monitoring Engine
      │
      └─ PostgreSQL Database
          └─ 17 Tables + Metrics
```

**Access:** http://localhost:4000  
**API:** http://localhost:4000/api/*  
**Frontend:** http://localhost:4000/*

### CSV Format
```csv
Username,IP Address,Device Name,Link,Network
admin,192.168.1.1,Router-1,Link-1,Network-1
```

**Networks:** Network-1 through Network-5  
**Links:** Link-1 through Link-3

### Default Login
- Username: `admin`
- Password: (from .env ADMIN_PASSWORD)

---

## Complete Documentation

- **BUILD_AND_DEPLOY_INSTRUCTIONS.md** - Build on Windows, deploy on Ubuntu
- **AIR_GAPPED_DEPLOYMENT.md** - Complete air-gapped deployment guide  
- **COMPLETE_PROJECT_DOCUMENTATION.md** - Technical reference (1,881 lines)
- **build-deployment.cmd** - Automated build script

---

## Technology Stack

**Frontend (274 packages):**
- React 19 - UI framework
- TanStack Router - Routing
- TanStack Query - State management
- Recharts - Charts and visualization
- Radix UI - UI components
- Tailwind CSS - Styling

**Backend (388 packages):**
- Node.js + Express - Web server
- TypeScript - Type safety
- PostgreSQL - Database
- Socket.io - Real-time updates
- JWT - Authentication
- ICMP/SNMP - Monitoring

**Total:** 662 packages (all bundled in deployment)

---

## System Requirements

**Ubuntu 24 VM:**
- Node.js 18+
- PostgreSQL 12+
- 2GB RAM minimum
- 500MB disk space
- NO internet required

---

## Deployment Model

1. **Build on Windows** (with internet)
   - Install dependencies
   - Build frontend → static files
   - Compile backend → JavaScript
   - Package everything → deployment.zip

2. **Transfer to Ubuntu VM** (USB/shared folder)
   - Copy zip file
   - Unzip on VM

3. **Deploy on Ubuntu** (no internet)
   - Configure database
   - Configure .env
   - Run migrations
   - Start with npm start

**Result:** Single-server application accessible at http://localhost:4000

---

