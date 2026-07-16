# AIR-GAPPED DEPLOYMENT GUIDE
## Setu - Ubuntu 24 Production Deployment

---

## CRITICAL DEPLOYMENT MODEL

This project is designed for **COMPLETE AIR-GAPPED** deployment in Ubuntu 24 VMs with:
- ❌ NO Internet access
- ❌ NO npm install
- ❌ NO apt install
- ❌ NO package downloads
- ❌ NO runtime dependencies
- ✅ Everything pre-bundled
- ✅ Single command to start: `npm start`

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Build on Windows](#build-on-windows)
3. [Transfer to Ubuntu VM](#transfer-to-ubuntu-vm)
4. [Deploy on Ubuntu VM](#deploy-on-ubuntu-vm)
5. [Verify Deployment](#verify-deployment)
6. [Troubleshooting](#troubleshooting)

---

## 1. OVERVIEW

### Deployment Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Ubuntu 24 VM (Air-Gapped)               │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Node.js Process (npm start)                        │  │
│  │                                                     │  │
│  │  ┌───────────────────────────────────────────────┐ │  │
│  │  │  Express Server (Port 4000)                   │ │  │
│  │  │                                               │ │  │
│  │  │  • API Routes (/api/*)                       │ │  │
│  │  │  • Static Files (/* → React SPA)             │ │  │
│  │  │  • WebSocket Server                          │ │  │
│  │  │  • Monitoring Engine                         │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                                │
│                           │                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Port 5432)                             │  │
│  │                                                     │  │
│  │  • 17 Tables                                        │  │
│  │  • Metrics Storage                                  │  │
│  │  • User Auth                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
             │
             │ Browser Access
             ▼
    http://localhost:4000
```

### What Gets Deployed

**Deployment Package Contains:**
- ✅ Compiled backend (TypeScript → JavaScript in `dist/`)
- ✅ Built frontend (React → static files in `public/`)
- ✅ All 662 npm packages in `node_modules/`
- ✅ Database migrations
- ✅ Configuration templates
- ✅ Complete documentation

**Total Size:** ~450 MB uncompressed, ~150-200 MB zipped

---

## 2. BUILD ON WINDOWS

### Prerequisites

- Node.js 18+ installed
- npm installed
- Git Bash or PowerShell

### Step 1: Install Dependencies (One Time)

**Only needed once on your Windows machine:**

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

This downloads all 662 packages. You'll transfer these with the deployment package.

### Step 2: Build for Production

```bash
# Build everything for production
npm run deploy:build
```

This command:
1. Builds frontend → `server/public/`
2. Compiles backend TypeScript → `server/dist/`

**Verify builds:**
```bash
# Check frontend build
ls server/public/index.html

# Check backend build
ls server/dist/index.js
```

### Step 3: Create Deployment Package

```bash
# Create deployment package
npm run deploy:package
```

This script:
1. Verifies builds exist
2. Creates `deployment/` folder
3. Copies only production files
4. Includes all node_modules
5. Creates DEPLOY.md
6. (Optional) Creates nms-deployment.zip

**Output:**
```
deployment/
├── server/
│   ├── dist/              # Compiled backend
│   ├── public/            # Built frontend
│   ├── node_modules/      # All packages
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
├── DEPLOY.md
├── README.md
├── UBUNTU_SETUP.md
└── COMPLETE_PROJECT_DOCUMENTATION.md
```

### Alternative: Manual Build

If you prefer manual control:

```bash
# 1. Build frontend to server/public
npm run build:prod

# 2. Build backend TypeScript
cd server
npm run build

# 3. Manually copy files to deployment folder
```

---

## 3. TRANSFER TO UBUNTU VM

### Method A: USB Drive

```bash
# On Windows
# 1. Copy deployment/ folder to USB
# OR copy nms-deployment.zip if created

# On Ubuntu VM
# 2. Mount USB
ls /media/$USER/

# 3. Copy to home directory
cp -r /media/$USER/USB_NAME/deployment ~/nms-deployment
# OR
cp /media/$USER/USB_NAME/nms-deployment.zip ~/
unzip ~/nms-deployment.zip
mv deployment nms-deployment
```

### Method B: Shared Folder (VMware/VirtualBox)

```bash
# On Ubuntu VM
# 1. Access shared folder
ls /mnt/hgfs/

# 2. Copy to home directory
cp -r /mnt/hgfs/shared/deployment ~/nms-deployment
```

### Method C: Network Transfer (if VMs are networked)

```bash
# On Windows (using scp)
scp -r deployment/ user@ubuntu-vm:~/nms-deployment

# On Ubuntu VM
# Files should appear in ~/nms-deployment
```

---

## 4. DEPLOY ON UBUNTU VM

### Prerequisites on Ubuntu VM

**Required (must be pre-installed):**
- Ubuntu 24.04 LTS
- Node.js 18+ (`node --version`)
- PostgreSQL 12+ (`psql --version`)

**If not installed, use Ubuntu ISO:**
```bash
# Mount Ubuntu installation media
sudo mkdir -p /mnt/cdrom
sudo mount -o loop /path/to/ubuntu-24.04.iso /mnt/cdrom
sudo apt-cdrom -m -d /mnt/cdrom add

# Install from media (NO INTERNET)
sudo apt install nodejs npm postgresql postgresql-contrib
```

### Step 1: Start PostgreSQL

```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify running
sudo systemctl status postgresql
```

### Step 2: Create Database

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE nms;
CREATE USER nms WITH PASSWORD 'nms_secret';
GRANT ALL PRIVILEGES ON DATABASE nms TO nms;
ALTER DATABASE nms OWNER TO nms;
\q
EOF

# Verify
sudo -u postgres psql -l | grep nms
```

### Step 3: Configure Application

```bash
cd ~/nms-deployment/server

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**CRITICAL: Change these values:**

```env
# CHANGE THIS - Generate random 32+ character string
JWT_SECRET=your-super-secret-random-32-char-string-change-this-now-abc123xyz

# CHANGE THIS - Set admin password
ADMIN_PASSWORD=YourStrongPassword123!

# Verify database connection
DATABASE_URL=postgresql://nms:nms_secret@localhost:5432/nms

# Production mode
NODE_ENV=production
PORT=4000

# CORS (since frontend served from same origin)
CORS_ORIGIN=http://localhost:4000
```

**Save:** Ctrl+O, Enter, Ctrl+X

### Step 4: Run Database Migrations

```bash
cd ~/nms-deployment/server

# Run migrations
npm run migrate
```

**Expected Output:**
```
[INFO] Connected to PostgreSQL
[INFO] Applying migration 001_init.sql
[INFO] Creating 17 tables...
[INFO] Seeding roles, permissions, networks, links
[INFO] Created admin user: admin
[INFO] Applying migration 002_production_improvements.sql
[INFO] Applying migration 003_metrics_partitioning_optional.sql
[INFO] Migrations complete
```

**Verify tables created:**
```bash
sudo -u postgres psql -d nms -c "\dt"
```

Should show 17 tables.

### Step 5: Grant ICMP Permission

```bash
# Allow Node.js to send ICMP pings
sudo setcap cap_net_raw+ep $(which node)

# Verify
getcap $(which node)
# Output: /usr/bin/node = cap_net_raw+ep
```

### Step 6: Start Application

```bash
cd ~/nms-deployment/server

# Start production server
npm start
```

**Expected Output:**
```
[INFO] Starting NMS Backend Server
[INFO] Environment: production
[INFO] Database connected
[INFO] Monitoring scheduler started (30s interval)
[INFO] Socket.io server initialized
[INFO] Serving frontend from: /home/user/nms-deployment/server/public
[INFO] Express server listening on port 4000
[INFO] Application ready: http://localhost:4000
```

### Step 7: Access Application

**Open browser:**
```
http://localhost:4000
```

**Login:**
- Username: `admin`
- Password: (from .env ADMIN_PASSWORD)

---

## 5. VERIFY DEPLOYMENT

### Quick Verification Checklist

```bash
# 1. Check Node.js process
ps aux | grep node
# Should show: npm start

# 2. Check port listening
netstat -tlnp | grep 4000
# Should show: 0.0.0.0:4000

# 3. Check backend health
curl http://localhost:4000/api/health
# Should return: {"status":"ok"}

# 4. Check frontend loads
curl http://localhost:4000 | grep "<title>"
# Should return HTML with title

# 5. Check database connection
sudo -u postgres psql -d nms -c "SELECT COUNT(*) FROM users;"
# Should return: 1 (admin user)

# 6. Check monitoring running
sudo -u postgres psql -d nms -c "SELECT COUNT(*) FROM metrics;"
# Wait 30s, should increase after device import
```

### Test Full Flow

1. **Import Devices**
   - Go to http://localhost:4000
   - Login with admin credentials
   - Click "Devices" → "Import CSV"
   - Upload test CSV
   - Verify import success

2. **Wait for First Poll**
   - Wait 30 seconds
   - Check backend logs for "Polling X devices..."

3. **View Dashboard**
   - Go to Dashboard
   - Should see metrics, charts, device status

4. **Check Real-time Updates**
   - Open browser console (F12)
   - Should see WebSocket connected
   - Metrics should update every 30s

---

## 6. TROUBLESHOOTING

### Issue: npm start fails with "Cannot find module"

**Cause:** node_modules not copied

**Solution:**
```bash
# Verify node_modules exists
ls ~/nms-deployment/server/node_modules/
# Should show 388 folders

# If missing, re-transfer deployment package
```

### Issue: Frontend shows blank page

**Cause:** Frontend not built or not in public/

**Solution:**
```bash
# Verify public/ exists
ls ~/nms-deployment/server/public/index.html
# Should exist

# Check Express logs for static file serving
# Should see: "Serving frontend from: .../public"
```

### Issue: Database connection fails

**Cause:** PostgreSQL not running or wrong credentials

**Solution:**
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep nms

# Check credentials in .env match database user
grep DATABASE_URL ~/nms-deployment/server/.env

# Test connection manually
psql postgresql://nms:nms_secret@localhost:5432/nms -c "SELECT 1;"
```

### Issue: Port 4000 already in use

**Cause:** Another process using port 4000

**Solution:**
```bash
# Find process using port 4000
sudo lsof -i :4000

# Kill it or change port in .env
nano ~/nms-deployment/server/.env
# Change PORT=4000 to PORT=4001
```

### Issue: ICMP ping fails (all devices show down)

**Cause:** Node.js doesn't have ICMP permission

**Solution:**
```bash
# Grant permission
sudo setcap cap_net_raw+ep $(which node)

# Verify
getcap $(which node)

# Restart application
```

### Issue: Application starts but can't access from browser

**Cause:** Firewall blocking port

**Solution:**
```bash
# Check firewall status
sudo ufw status

# Allow port 4000
sudo ufw allow 4000/tcp

# Or disable firewall (if safe)
sudo ufw disable
```

---

## PRODUCTION RECOMMENDATIONS

### Run as Systemd Service

Create `/etc/systemd/system/nms.service`:

```ini
[Unit]
Description=Setu Network Monitoring
After=network.target postgresql.service

[Service]
Type=simple
User=nms-user
WorkingDirectory=/home/nms-user/nms-deployment/server
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nms/output.log
StandardError=append:/var/log/nms/error.log

[Install]
WantedBy=multi-user.target
```

**Enable service:**
```bash
sudo mkdir -p /var/log/nms
sudo systemctl daemon-reload
sudo systemctl enable nms
sudo systemctl start nms
sudo systemctl status nms
```

### Backup Strategy

```bash
# Backup database
sudo -u postgres pg_dump nms > ~/backups/nms_$(date +%Y%m%d).sql

# Backup .env
cp ~/nms-deployment/server/.env ~/backups/.env.backup

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /usr/bin/pg_dump nms > ~/backups/nms_$(date +\%Y\%m\%d).sql
```

### Log Rotation

```bash
# Edit logrotate config
sudo nano /etc/logrotate.d/nms
```

Add:
```
/var/log/nms/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 640 nms-user nms-user
    sharedscripts
    postrotate
        systemctl reload nms
    endscript
}
```

---

## SECURITY CHECKLIST

- [ ] Changed JWT_SECRET to random string
- [ ] Changed ADMIN_PASSWORD to strong password
- [ ] PostgreSQL accepts only localhost connections
- [ ] Firewall configured (only port 4000 if needed)
- [ ] ICMP capability granted only to node binary
- [ ] Application runs as non-root user
- [ ] Logs directory has proper permissions
- [ ] Backup strategy in place
- [ ] .env file has restrictive permissions (chmod 600)

---

## DEPLOYMENT SUMMARY

**What You Built:**
- Frontend: React SPA compiled to static files
- Backend: TypeScript compiled to JavaScript
- Everything bundled with all dependencies

**What You Transferred:**
- Single folder/zip (~200 MB)
- Contains everything (no downloads needed)

**What Runs on Ubuntu VM:**
- Single Node.js process (`npm start`)
- Express serves both API and frontend
- PostgreSQL stores all data
- Monitoring engine polls devices every 30s
- WebSocket pushes real-time updates

**Access:**
- Single URL: http://localhost:4000
- API: http://localhost:4000/api/*
- Frontend: http://localhost:4000/*

**Zero Internet Dependency:**
- No npm install
- No external APIs
- No CDN resources
- No runtime downloads
- 100% offline operation

---

**END OF DEPLOYMENT GUIDE**
