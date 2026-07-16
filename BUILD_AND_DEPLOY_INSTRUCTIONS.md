# BUILD AND DEPLOY INSTRUCTIONS
## Setu - Air-Gapped Ubuntu 24 Deployment

---

## OVERVIEW

This document provides complete instructions for building a production deployment package on Windows and deploying it to an air-gapped Ubuntu 24 VM.

**Deployment Model:**
- Build on Windows (with internet)
- Transfer to Ubuntu VM (no internet)
- Deploy and run (completely offline)

**Single Command to Start:** `npm start`

---

## PART 1: BUILD ON WINDOWS

### Prerequisites

✅ Node.js 18+ installed  
✅ npm installed  
✅ Git (optional, for version control)  
✅ This project folder

### Step 1: Install Dependencies (One Time)

**Only needed once on your Windows development machine:**

```cmd
REM Root dependencies (frontend)
npm install

REM Server dependencies (backend)
cd server
npm install
cd ..
```

This downloads all 662 npm packages to `node_modules/` folders.

### Step 2: Build Production Package

**Run the build script:**

```cmd
build-deployment.cmd
```

**What this does:**
1. ✅ Cleans previous builds
2. ✅ Builds frontend (React → static files)
3. ✅ Copies frontend to `server/public/`
4. ✅ Builds backend (TypeScript → JavaScript)
5. ✅ Creates `deployment/` folder with everything
6. ✅ Copies all node_modules (662 packages)
7. ✅ Includes database migrations
8. ✅ Adds documentation

**Output:**
```
deployment/
├── server/
│   ├── dist/              # Compiled backend
│   ├── public/            # Built frontend
│   │   ├── index.html
│   │   ├── assets/        # 36 JS/CSS files
│   │   ├── favicon.ico
│   │   └── robots.txt
│   ├── node_modules/      # 388 backend packages
│   ├── src/db/migrations/ # SQL files
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
├── AIR_GAPPED_DEPLOYMENT.md
├── COMPLETE_PROJECT_DOCUMENTATION.md
└── README.md
```

**Package Size:** ~450 MB

### Step 3: Create Zip File

**Windows Explorer:**
1. Right-click `deployment` folder
2. "Send to" → "Compressed (zipped) folder"
3. Rename to `nms-deployment.zip`

**OR PowerShell:**
```powershell
Compress-Archive -Path deployment -DestinationPath nms-deployment.zip
```

**Zip Size:** ~150-200 MB

---

## PART 2: TRANSFER TO UBUNTU VM

### Method A: USB Drive

1. Copy `nms-deployment.zip` to USB drive
2. Insert USB into Ubuntu VM
3. Copy to home directory:
   ```bash
   cp /media/$USER/USB_NAME/nms-deployment.zip ~/
   cd ~
   unzip nms-deployment.zip
   ```

### Method B: Shared Folder (VMware/VirtualBox)

1. Setup shared folder in VM settings
2. Copy zip to shared folder
3. On Ubuntu VM:
   ```bash
   cp /mnt/hgfs/shared/nms-deployment.zip ~/
   cd ~
   unzip nms-deployment.zip
   ```

### Method C: Direct Folder Copy

If you can access the VM filesystem directly:
```bash
# Copy entire deployment folder
cp -r /path/to/deployment ~/nms-deployment
```

---

## PART 3: DEPLOY ON UBUNTU VM

### Prerequisites on Ubuntu 24 VM

**Must be pre-installed (NO internet on VM):**

✅ Ubuntu 24.04 LTS  
✅ Node.js 18+ (`node --version`)  
✅ npm 9+ (`npm --version`)  
✅ PostgreSQL 12+ (`psql --version`)  

**If not installed:**

Use Ubuntu installation ISO to install packages:

```bash
# Mount Ubuntu ISO
sudo mkdir -p /mnt/cdrom
sudo mount -o loop /path/to/ubuntu-24.04.iso /mnt/cdrom
sudo apt-cdrom -m -d /mnt/cdrom add

# Install from ISO (NO INTERNET NEEDED)
sudo apt install nodejs npm postgresql postgresql-contrib

# Verify
node --version  # Should be 18+
npm --version   # Should be 9+
psql --version  # Should be 14+
```

### Step 1: Start PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

### Step 2: Create Database

```bash
sudo -u postgres psql << EOF
CREATE DATABASE nms;
CREATE USER nms WITH PASSWORD 'nms_secret';
GRANT ALL PRIVILEGES ON DATABASE nms TO nms;
ALTER DATABASE nms OWNER TO nms;
\q
EOF
```

**Verify:**
```bash
sudo -u postgres psql -l | grep nms
# Should show: nms | nms | UTF8
```

### Step 3: Configure Application

```bash
cd ~/nms-deployment/server
cp .env.example .env
nano .env
```

**CRITICAL - Change these values:**

```env
# MUST CHANGE - Generate random 32+ character string
JWT_SECRET=change-this-to-a-super-secret-random-string-at-least-32-chars-long-abc123xyz789

# MUST CHANGE - Set your admin password
ADMIN_PASSWORD=YourStrongPassword123!

# Verify database connection (change if you used different password)
DATABASE_URL=postgresql://nms:nms_secret@localhost:5432/nms

# Production settings
NODE_ENV=production
PORT=4000

# CORS - same origin since Express serves frontend
CORS_ORIGIN=http://localhost:4000
```

**Generate random JWT secret:**
```bash
# Option 1: openssl
openssl rand -base64 32

# Option 2: /dev/urandom
head -c 32 /dev/urandom | base64
```

**Save:** Ctrl+O, Enter, Ctrl+X

### Step 4: Run Database Migrations

```bash
cd ~/nms-deployment/server
npm run migrate
```

**Expected output:**
```
[INFO] Connected to PostgreSQL
[INFO] Applying migration 001_init.sql
[INFO] Creating 17 tables...
[INFO] Seeding roles, permissions, networks, links
[INFO] Created admin user: admin
[INFO] Applying migration 002_production_improvements.sql
[INFO] Applying migration 003_metrics_partitioning_optional.sql
[INFO] Migrations complete ✓
```

**Verify tables:**
```bash
sudo -u postgres psql -d nms -c "\dt"
```

Should show 17 tables.

### Step 5: Grant ICMP Permission

```bash
# Allow Node.js to send ICMP pings without sudo
sudo setcap cap_net_raw+ep $(which node)

# Verify
getcap $(which node)
# Output: /usr/bin/node = cap_net_raw+ep
```

### Step 6: Start Application

```bash
cd ~/nms-deployment/server
npm start
```

**Expected output:**
```
[INFO] Starting NMS Backend Server
[INFO] Environment: production
[INFO] Database connected ✓
[INFO] Monitoring scheduler started (30s interval) ✓
[INFO] Socket.io server initialized ✓
[INFO] Serving frontend from: /home/user/nms-deployment/server/public ✓
[INFO] Express server listening on port 4000 ✓
[INFO] Application ready: http://localhost:4000
```

**Leave this terminal open!**

---

## PART 4: ACCESS APPLICATION

### Open Browser

Navigate to:
```
http://localhost:4000
```

### Login

- **Username:** `admin`
- **Password:** (from .env ADMIN_PASSWORD)

### First-Time Setup

1. Click **Devices** in sidebar
2. Click **Import CSV**
3. Upload your device CSV file
4. Click **Confirm Import**
5. Wait 30 seconds for first poll
6. Go to **Dashboard** - see metrics!

### CSV Format

```csv
Username,IP Address,Device Name,Link,Network
admin,192.168.1.1,Core-Router,Link-1,Network-1
admin,192.168.1.2,Core-Switch,Link-1,Network-1
admin,192.168.2.1,Branch-Router,Link-2,Network-2
```

**Networks:** Network-1, Network-2, Network-3, Network-4, Network-5  
**Links:** Link-1, Link-2, Link-3

---

## VERIFICATION CHECKLIST

```bash
# 1. Check Node.js process running
ps aux | grep node

# 2. Check port 4000 listening
netstat -tlnp | grep 4000

# 3. Check backend health
curl http://localhost:4000/api/health
# Should return: {"status":"ok"}

# 4. Check frontend loads
curl http://localhost:4000 | grep Setu

# 5. Check database
sudo -u postgres psql -d nms -c "SELECT COUNT(*) FROM users;"
# Should return: 1

# 6. Check tables created
sudo -u postgres psql -d nms -c "\dt"
# Should show 17 tables
```

---

## TROUBLESHOOTING

### Issue: npm start fails

```bash
# Check node_modules exists
ls ~/nms-deployment/server/node_modules/
# Should show 388 folders

# If missing, deployment package corrupted - re-transfer
```

### Issue: Database connection fails

```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep nms

# Test connection
psql postgresql://nms:nms_secret@localhost:5432/nms -c "SELECT 1;"
```

### Issue: Port 4000 in use

```bash
# Find what's using port 4000
sudo lsof -i :4000

# Kill it or change PORT in .env
```

### Issue: Frontend blank page

```bash
# Check index.html exists
ls ~/nms-deployment/server/public/index.html

# Check assets exist
ls ~/nms-deployment/server/public/assets/
# Should show 36 files

# Check backend logs (in terminal where npm start runs)
```

### Issue: All devices show "down"

```bash
# Check ICMP permission
getcap $(which node)
# Should show: cap_net_raw+ep

# Grant permission
sudo setcap cap_net_raw+ep $(which node)

# Restart application
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
User=your-username
WorkingDirectory=/home/your-username/nms-deployment/server
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nms.log
StandardError=append:/var/log/nms-error.log

[Install]
WantedBy=multi-user.target
```

**Enable:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable nms
sudo systemctl start nms
sudo systemctl status nms
```

### Daily Backup

```bash
# Backup database
sudo -u postgres pg_dump nms > ~/backups/nms_$(date +%Y%m%d).sql

# Backup .env
cp ~/nms-deployment/server/.env ~/backups/.env.backup
```

### Monitor Logs

```bash
# View logs
tail -f /var/log/nms.log

# Or if running in terminal
# Logs appear in the terminal where you ran npm start
```

---

## WHAT'S INCLUDED

### Frontend (Built React SPA)
- ✅ Static HTML, CSS, JS files
- ✅ All 274 npm packages bundled
- ✅ Charts (Recharts)
- ✅ UI components (Radix UI)
- ✅ Icons (Lucide React)
- ✅ System fonts only (no external fonts)

### Backend (Compiled Express API)
- ✅ Compiled TypeScript → JavaScript
- ✅ All 388 npm packages
- ✅ REST API endpoints
- ✅ WebSocket server (Socket.io)
- ✅ Monitoring engine (ICMP + SNMP)
- ✅ Database migrations

### Database
- ✅ 17 tables auto-created
- ✅ Pre-seeded data (roles, networks, links)
- ✅ Admin user created
- ✅ PostgreSQL local instance

---

## DEPLOYMENT SUMMARY

**Build Phase (Windows with internet):**
1. npm install (downloads 662 packages)
2. npm run build (compiles everything)
3. Create deployment folder (copies everything)
4. Zip and transfer

**Deploy Phase (Ubuntu without internet):**
1. Unzip package
2. Configure database
3. Configure .env
4. Run migrations
5. Start with npm start

**Result:**
- Single URL: http://localhost:4000
- No npm install needed on Ubuntu
- No internet needed on Ubuntu
- Everything pre-bundled
- Just configure and run

---

## FILE SIZES

- Uncompressed package: ~450 MB
- Compressed zip: ~150-200 MB
- Frontend assets: ~3 MB
- Backend dist: ~200 KB
- node_modules: ~445 MB

---

## SUPPORT

For detailed troubleshooting, see:
- `AIR_GAPPED_DEPLOYMENT.md` - Complete deployment guide
- `COMPLETE_PROJECT_DOCUMENTATION.md` - Technical reference

For issues:
1. Check logs in terminal
2. Verify prerequisites installed
3. Check database connection
4. Verify port 4000 not in use
5. Check ICMP permission granted

---

**END OF BUILD AND DEPLOY INSTRUCTIONS**

Setu - Network Monitoring System
Air-Gapped Deployment for Ubuntu 24
