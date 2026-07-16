# Setu - Complete Deployment Checklist
## Air-Gapped Ubuntu 24 VM Deployment

---

## 📋 PRE-DEPLOYMENT VERIFICATION

### ✅ On Windows (Build Machine)

**Verify these before building:**

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] This project folder present
- [ ] Internet connection available

**Run these commands:**

```cmd
REM 1. Install dependencies (one time only)
npm install
cd server
npm install
cd ..

REM 2. Verify installations
dir node_modules     REM Should show ~274 folders
dir server\node_modules   REM Should show ~388 folders
```

---

## 🏗️ BUILD PROCESS

### Step 1: Run Build Script

```cmd
build-deployment.cmd
```

**Expected output:**
```
Step 1: Cleaning previous builds...
Step 2: Building frontend...
Frontend built successfully
Step 3: Building backend...
Backend built successfully
Step 4: Verifying builds...
Builds verified
Step 5: Creating deployment package...
Deployment package created
Step 6: Package created successfully
```

**Verify build succeeded:**
- [ ] `deployment/` folder created
- [ ] `deployment/server/dist/` exists (backend compiled)
- [ ] `deployment/server/public/` exists (frontend built)
- [ ] `deployment/server/node_modules/` exists (388 packages)

### Step 2: Inspect Deployment Package

```cmd
REM Check structure
dir deployment\server

REM Should see:
REM   dist\           (compiled backend)
REM   public\         (built frontend)
REM   node_modules\   (388 packages)
REM   src\db\migrations\  (SQL files)
REM   package.json
REM   .env.example
```

### Step 3: Create Zip File

**Method A: Windows Explorer**
1. Right-click `deployment` folder
2. "Send to" → "Compressed (zipped) folder"
3. Rename to `setu-deployment.zip`

**Method B: PowerShell**
```powershell
Compress-Archive -Path deployment -DestinationPath setu-deployment.zip
```

**Verify zip:**
- [ ] `setu-deployment.zip` created
- [ ] Size: ~150-200 MB
- [ ] Can extract and see `server/` folder inside

---

## 📦 TRANSFER TO UBUNTU VM

### Choose Transfer Method

**Option A: USB Drive**
1. Copy `setu-deployment.zip` to USB
2. Insert USB into Ubuntu VM
3. Copy from USB to home directory

**Option B: Shared Folder (VMware/VirtualBox)**
1. Setup shared folder in VM settings
2. Copy zip to shared folder
3. Access from Ubuntu VM at `/mnt/hgfs/` or similar

**Option C: Direct Copy**
- If you have direct filesystem access to VM

**Verification on Ubuntu VM:**
```bash
# Check file exists and size is correct
ls -lh ~/setu-deployment.zip
# Should be ~150-200 MB

# Unzip
unzip setu-deployment.zip
cd deployment/server

# Verify structure
ls -la
# Should see: dist/ public/ node_modules/ package.json .env.example
```

---

## 🐘 POSTGRESQL SETUP (Ubuntu VM)

### Pre-Check

```bash
# Check PostgreSQL installed
psql --version

# If not installed, see POSTGRESQL_SETUP_UBUNTU.md for:
# - Online installation (apt)
# - Offline installation (ISO/deb packages)
```

### Create Database

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE setu_nms;
CREATE USER setu WITH PASSWORD 'setu_secret_2024';
GRANT ALL PRIVILEGES ON DATABASE setu_nms TO setu;
ALTER DATABASE setu_nms OWNER TO setu;
\q
EOF
```

### Verify Database

```bash
# List databases
sudo -u postgres psql -l | grep setu_nms

# Test connection
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "SELECT 1;"

# Should return:
#  ?column? 
# ----------
#         1
```

**Checklist:**
- [ ] PostgreSQL service running
- [ ] Database `setu_nms` created
- [ ] User `setu` created
- [ ] User has all privileges on database
- [ ] Can connect successfully

---

## ⚙️ APPLICATION CONFIGURATION

### Step 1: Configure Environment

```bash
cd ~/deployment/server

# Copy example env file
cp .env.example .env

# Edit configuration
nano .env
```

### Step 2: CRITICAL - Update .env

**You MUST change these values:**

```env
# MUST CHANGE - Generate random 32+ character string
JWT_SECRET=change-this-to-a-super-secret-random-string-at-least-32-chars-long

# MUST CHANGE - Set your admin password
ADMIN_PASSWORD=YourStrongPassword123!

# Verify database connection (update if you used different password)
DATABASE_URL=postgresql://setu:setu_secret_2024@localhost:5432/setu_nms

# These are usually fine as-is
NODE_ENV=production
PORT=4000
CORS_ORIGIN=http://localhost:4000
```

**Generate random JWT secret:**
```bash
# Option 1: openssl
openssl rand -base64 32

# Option 2: urandom
head -c 32 /dev/urandom | base64

# Copy output and paste into JWT_SECRET
```

**Save:** Ctrl+O, Enter, Ctrl+X

### Step 3: Verify Configuration

```bash
# Check .env file exists
ls -la .env

# Verify DATABASE_URL is correct
grep DATABASE_URL .env

# Verify JWT_SECRET was changed (not default)
grep JWT_SECRET .env
```

**Checklist:**
- [ ] .env file created
- [ ] JWT_SECRET changed to random string
- [ ] ADMIN_PASSWORD changed
- [ ] DATABASE_URL points to correct database
- [ ] All required variables present

---

## 🗄️ DATABASE MIGRATION

### Run Migrations

```bash
cd ~/deployment/server
npm run migrate
```

**Expected output:**
```
[INFO] Connected to PostgreSQL
[INFO] Applying migration 001_init.sql
[INFO] Creating tables: users, roles, permissions, role_permissions, networks, links, devices, device_links, metrics, alerts, alert_history, uploads, reports, settings, audit_logs, notification_history, system_logs
[INFO] Seeding initial data...
[INFO] Created 3 roles: admin, operator, viewer
[INFO] Created 5 networks: Network-1, Network-2, Network-3, Network-4, Network-5
[INFO] Created 3 links: Link-1, Link-2, Link-3
[INFO] Created admin user: admin
[INFO] Applying migration 002_production_improvements.sql
[INFO] Applying migration 003_metrics_partitioning_optional.sql
[INFO] Migrations complete ✓
```

### Verify Tables

```bash
# List all tables
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "\dt"

# Should show 17 tables:
# users, roles, permissions, role_permissions, networks, links, devices, 
# device_links, metrics, alerts, alert_history, uploads, reports, settings, 
# audit_logs, notification_history, system_logs

# Verify admin user created
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "SELECT username FROM users;"

# Should show: admin
```

**Checklist:**
- [ ] Migrations ran without errors
- [ ] 17 tables created
- [ ] Admin user exists
- [ ] Networks and links seeded

---

## 🔐 GRANT ICMP PERMISSION

### Why This is Needed

Node.js needs special permission to send ICMP ping packets. Without this, all devices will show as "down".

### Grant Permission

```bash
# Grant capability to node binary
sudo setcap cap_net_raw+ep $(which node)

# Verify permission granted
getcap $(which node)
```

**Expected output:**
```
/usr/bin/node = cap_net_raw+ep
```

**Checklist:**
- [ ] Permission granted successfully
- [ ] Verification shows `cap_net_raw+ep`

---

## 🚀 START APPLICATION

### Start Server

```bash
cd ~/deployment/server
npm start
```

**Expected output:**
```
[INFO] Starting Setu Backend Server
[INFO] Environment: production
[INFO] Database URL: postgresql://setu:setu_secret_2024@localhost:5432/setu_nms
[INFO] Database connected ✓
[INFO] Monitoring scheduler started (30s interval) ✓
[INFO] Socket.io server initialized ✓
[INFO] Serving frontend from: /home/user/deployment/server/public ✓
[INFO] Swagger docs: http://localhost:4000/api-docs
[INFO] Express server listening on port 4000 ✓
[INFO] Application ready: http://localhost:4000
```

**IMPORTANT:** Leave this terminal window open! The application is running here.

**Checklist:**
- [ ] Backend starts without errors
- [ ] Database connection successful
- [ ] Monitoring scheduler started
- [ ] Express listening on port 4000
- [ ] Frontend being served from public/

---

## 🌐 ACCESS APPLICATION

### Open Browser

1. Open Firefox or Chrome on Ubuntu VM
2. Navigate to: `http://localhost:4000`
3. Should see Setu login page

### Login

**Default credentials:**
- **Username:** `admin`
- **Password:** (the password you set in .env ADMIN_PASSWORD)

### Verify Login

After login, you should see:
- [ ] Dashboard page loads
- [ ] Sidebar shows: Dashboard, Networks, Devices, etc.
- [ ] Top right shows "admin" username
- [ ] No console errors (press F12 to check)

---

## 📊 IMPORT DEVICES

### Step 1: Prepare CSV File

Create a CSV file with this format:

```csv
Username,IP Address,Device Name,Link,Network
admin,192.168.1.1,Core-Router,Link-1,Network-1
admin,192.168.1.2,Core-Switch,Link-1,Network-1
admin,192.168.2.1,Branch-Router,Link-2,Network-2
admin,10.0.0.1,Test-Device,Link-3,Network-3
```

**Rules:**
- Networks: Must be `Network-1`, `Network-2`, `Network-3`, `Network-4`, or `Network-5`
- Links: Must be `Link-1`, `Link-2`, or `Link-3`
- IP Address: Valid IPv4 address
- Device Name: Unique identifier

### Step 2: Import via UI

1. Click **Devices** in sidebar
2. Click **Import CSV** button (top right)
3. Click **Choose File** and select your CSV
4. Review device list
5. Click **Confirm Import**

### Step 3: Wait for First Poll

The monitoring engine runs every 30 seconds:
- Wait ~30 seconds for first monitoring cycle
- Devices will initially show as "Unknown"
- After first poll, status will update to "Up" or "Down"

### Step 4: Verify Monitoring

**Check Dashboard:**
1. Click **Dashboard** in sidebar
2. Should see:
   - Device status counts (Up/Down/Unknown)
   - Network latency chart
   - Bandwidth utilization chart
   - Link performance chart

**Check Backend Logs:**
In the terminal where `npm start` is running, you should see:
```
[INFO] Monitoring cycle started
[INFO] Polling device: Core-Router (192.168.1.1)
[INFO] ICMP ping to 192.168.1.1: success (latency: 5.2ms, loss: 0%)
[INFO] SNMP poll to 192.168.1.1: success (in: 1.2 Mbps, out: 0.8 Mbps)
[INFO] Monitoring cycle complete (4 devices polled)
```

**Checklist:**
- [ ] CSV imported successfully
- [ ] Devices appear in device list
- [ ] Backend logs show monitoring cycles
- [ ] Device status updates after ~30 seconds
- [ ] Dashboard shows metrics
- [ ] Charts display data

---

## ✅ FULL SYSTEM VERIFICATION

### Backend Verification

```bash
# 1. Check Node.js process running
ps aux | grep node

# 2. Check port 4000 listening
netstat -tlnp | grep 4000

# 3. Test API health endpoint
curl http://localhost:4000/api/health
# Should return: {"status":"ok"}

# 4. Test frontend loads
curl -s http://localhost:4000 | grep -i setu
# Should find "Setu" in HTML

# 5. Check database connection
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "SELECT COUNT(*) FROM users;"
# Should return: 1 (admin user)

# 6. Check device count
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "SELECT COUNT(*) FROM devices;"
# Should return: (number of devices you imported)

# 7. Check metrics being collected
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "SELECT COUNT(*) FROM metrics;"
# Should increase every 30 seconds
```

### Frontend Verification

**In browser (F12 console):**
- [ ] No 404 errors for assets
- [ ] No CORS errors
- [ ] WebSocket connected (check Network tab)
- [ ] API calls succeed (check Network tab)

**Visual verification:**
- [ ] Login page displays correctly
- [ ] Dashboard loads with charts
- [ ] Devices page shows imported devices
- [ ] Alerts page accessible
- [ ] Settings page accessible
- [ ] All sidebar links work

### Monitoring Verification

**In backend terminal, every 30 seconds you should see:**
```
[INFO] Monitoring cycle started
[INFO] Polling device: <device-name> (<ip>)
[INFO] ICMP ping to <ip>: success (latency: Xms, loss: 0%)
[INFO] SNMP poll to <ip>: success/timeout/error
[INFO] Monitoring cycle complete
```

**In Dashboard:**
- [ ] Charts update every 30 seconds
- [ ] Device status reflects actual reachability
- [ ] Latency values are reasonable
- [ ] Bandwidth values present (if SNMP enabled)

---

## 🎯 COMPLETE SUCCESS CRITERIA

**All checkboxes ticked:**

### Build Phase (Windows)
- [✓] Dependencies installed (274 frontend + 388 backend)
- [✓] Build script ran successfully
- [✓] Deployment package created (~450 MB)
- [✓] Zip file created (~150-200 MB)

### Transfer Phase
- [✓] Zip transferred to Ubuntu VM
- [✓] Extracted successfully
- [✓] All files present in deployment/server/

### PostgreSQL Phase
- [✓] PostgreSQL installed and running
- [✓] Database `setu_nms` created
- [✓] User `setu` created with permissions
- [✓] Connection test successful

### Configuration Phase
- [✓] .env file created from example
- [✓] JWT_SECRET changed to random value
- [✓] ADMIN_PASSWORD set
- [✓] DATABASE_URL correct
- [✓] File permissions set (chmod 600 .env)

### Migration Phase
- [✓] Migrations ran without errors
- [✓] 17 tables created
- [✓] Admin user exists
- [✓] Networks and links seeded

### Runtime Phase
- [✓] ICMP permission granted
- [✓] Application starts without errors
- [✓] Backend listens on port 4000
- [✓] Database connection successful
- [✓] Monitoring scheduler running

### Access Phase
- [✓] Frontend loads in browser
- [✓] Login successful
- [✓] Dashboard displays
- [✓] All pages accessible
- [✓] No console errors

### Functionality Phase
- [✓] CSV import works
- [✓] Devices appear in list
- [✓] Monitoring cycles run every 30 seconds
- [✓] Device status updates
- [✓] Charts display data
- [✓] Real-time updates via WebSocket

---

## 🔧 QUICK TROUBLESHOOTING

### Issue: npm start fails

**Check:**
```bash
# Verify node_modules exists
ls ~/deployment/server/node_modules/ | wc -l
# Should show ~388

# Check .env file exists
cat ~/deployment/server/.env | grep DATABASE_URL
```

### Issue: Database connection fails

**Check:**
```bash
# PostgreSQL running?
sudo systemctl status postgresql

# Database exists?
sudo -u postgres psql -l | grep setu_nms

# Can connect manually?
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "SELECT 1;"
```

### Issue: Frontend shows blank page

**Check:**
```bash
# index.html exists?
ls ~/deployment/server/public/index.html

# Assets exist?
ls ~/deployment/server/public/assets/ | wc -l
# Should show ~36 files

# Backend serving correctly?
curl http://localhost:4000 | grep Setu
```

### Issue: All devices show "down"

**Check:**
```bash
# ICMP permission granted?
getcap $(which node)
# Should show: cap_net_raw+ep

# Grant if missing:
sudo setcap cap_net_raw+ep $(which node)

# Restart application
```

### Issue: Port 4000 in use

**Check:**
```bash
# What's using port 4000?
sudo lsof -i :4000

# Kill it or change PORT in .env
```

---

## 🏆 PRODUCTION SETUP (Optional)

### Run as Systemd Service

**Create service file:**
```bash
sudo nano /etc/systemd/system/setu.service
```

**Content:**
```ini
[Unit]
Description=Setu Network Monitoring System
After=network.target postgresql.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/deployment/server
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/setu.log
StandardError=append:/var/log/setu-error.log

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable setu
sudo systemctl start setu
sudo systemctl status setu
```

### Setup Daily Backup

**Create backup script:**
```bash
nano ~/backup-setu.sh
```

**Content:**
```bash
#!/bin/bash
BACKUP_DIR=~/setu-backups
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump setu_nms > $BACKUP_DIR/setu_$(date +%Y%m%d).sql

# Backup .env
cp ~/deployment/server/.env $BACKUP_DIR/.env.$(date +%Y%m%d)

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

**Make executable:**
```bash
chmod +x ~/backup-setu.sh
```

**Add to crontab:**
```bash
crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * /home/your-username/backup-setu.sh
```

---

## 📚 DOCUMENTATION REFERENCE

| Document | Purpose |
|----------|---------|
| **BUILD_AND_DEPLOY_INSTRUCTIONS.md** | Complete build and deployment guide |
| **POSTGRESQL_SETUP_UBUNTU.md** | PostgreSQL installation (online/offline) |
| **AIR_GAPPED_DEPLOYMENT.md** | Air-gapped deployment reference |
| **COMPLETE_PROJECT_DOCUMENTATION.md** | Technical reference (1,881 lines) |
| **PROJECT_SUMMARY.md** | Project overview and quick reference |
| **README.md** | Quick start guide |
| **DEPLOYMENT_CHECKLIST.md** | This document |

---

## 🎊 DEPLOYMENT COMPLETE!

If all checkboxes are ticked, your Setu Network Monitoring System is successfully deployed and operational in your air-gapped Ubuntu 24 VM!

**Access your system:**
- **URL:** http://localhost:4000
- **Username:** admin
- **Password:** (from your .env ADMIN_PASSWORD)

**Enjoy monitoring your network!** 🚀

---

**Setu - Network Monitoring System**  
*Complete Air-Gapped Deployment* ✅
