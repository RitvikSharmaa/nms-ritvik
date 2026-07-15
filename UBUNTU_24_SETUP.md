# 🚀 Ubuntu 24.04 Setup - Complete Guide

## What You Asked For: Unzip → Setup → Everything Works!

**The database and all tables are created automatically on first run!**

---

## 📋 What Happens Automatically

When you run the application for the first time:

1. ✅ **PostgreSQL database** starts in Docker
2. ✅ **All 17 tables** are created automatically
3. ✅ **All indexes and constraints** are created
4. ✅ **5 networks** are seeded (Network-1 through Network-5)
5. ✅ **3 links** are seeded (Link-1 through Link-3)
6. ✅ **3 roles** are created (Admin, Operator, Viewer)
7. ✅ **Admin user** is created with your password
8. ✅ **Default settings** are configured
9. ✅ **Everything ready** - just upload your device CSV and start monitoring!

**You don't need to manually create anything!** 🎉

---

## ⚠️ Prerequisites (One-Time Setup on Ubuntu 24.04)

### Before Going Offline, Install Docker (While Connected to Internet):

```bash
# Update package list
sudo apt update

# Install Docker (Ubuntu 24.04 compatible)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (important!)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Logout and login again to apply group changes
# Or run: newgrp docker

# Verify Docker works without sudo
docker --version
docker compose version
docker ps
```

### Pull Required Docker Images (While Connected):

```bash
# Pull these 3 images (MUST DO before going offline!)
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull nginx:alpine

# Verify images are downloaded
docker images

# Expected output:
# postgres        16-alpine
# node            20-alpine  
# nginx           alpine
```

**After this, you can disconnect from internet and everything will work offline!**

---

## 🎯 Setup Instructions (After Unzip on Ubuntu 24.04)

### Step 1: Navigate to Project Folder

```bash
# Unzip if you haven't already
cd ~
unzip nms-ritvik.zip

# Navigate to project
cd nms-ritvik

# Verify files are there
ls -la
```

You should see:
- `setup-ubuntu.sh`
- `docker-compose.yml`
- `server/` folder
- `src/` folder

---

### Step 2: Configure Database Connection

The database runs in Docker - you just need to set your admin password!

```bash
# Copy example config
cp server/.env.example server/.env

# Edit config
nano server/.env
```

**You MUST change these two lines:**

```bash
# Change this to a random 32+ character string
JWT_SECRET=your-super-secret-random-string-min-32-chars-please-change-this

# Change this to your desired admin password
ADMIN_PASSWORD=YourStrongPassword123!
```

**Database settings are already configured correctly:**
```bash
# These are already set correctly for Docker - DO NOT CHANGE
DATABASE_URL=postgresql://nms:nms_secret@postgres:5432/nms
DB_HOST=postgres
DB_PORT=5432
DB_USER=nms
DB_PASSWORD=nms_secret
DB_NAME=nms
```

**Save and exit:**
- Press `Ctrl+O` (save)
- Press `Enter` (confirm)
- Press `Ctrl+X` (exit nano)

---

### Step 3: Run Setup Script

```bash
# Make script executable
chmod +x setup-ubuntu.sh

# Run setup (builds everything and starts services)
./setup-ubuntu.sh
```

**What happens:**
1. ✅ Checks Docker is installed (Ubuntu 24.04 compatible)
2. ✅ Checks Docker images are available
3. ✅ Builds application (3-5 minutes - compiles TypeScript, bundles frontend)
4. ✅ Starts PostgreSQL database in Docker
5. ✅ **Automatically runs migrations** (creates all 17 tables)
6. ✅ **Seeds initial data** (networks, links, roles, admin user)
7. ✅ Starts backend API with monitoring engine
8. ✅ Starts frontend
9. ✅ Starts Nginx reverse proxy
10. ✅ Shows success message!

**Total time: 5-8 minutes**

**Expected final output:**
```
============================================
Setup Complete!
============================================

✓ NetPulse NMS is running!

Access the application:
  http://localhost

Default login credentials:
  Username: admin
  Password: (check your server/.env file)
```

---

### Step 4: Access Application

**Open browser and go to:**
```
http://localhost
```

**Login with:**
- **Username**: `admin`
- **Password**: (the password you set in Step 2)

**You should see the Dashboard!** 🎉

---

## 📊 Database Tables (Created Automatically)

When you run for the first time, these **17 tables** are created automatically:

| Table | Purpose | Auto-Created |
|-------|---------|--------------|
| `users` | User accounts with bcrypt passwords | ✅ |
| `roles` | Admin, Operator, Viewer | ✅ Seeded |
| `permissions` | Granular access control | ✅ Seeded |
| `role_permissions` | Role-permission mapping | ✅ |
| `networks` | 5 fixed networks (Network-1 to 5) | ✅ Seeded |
| `links` | 3 links (Link-1 to 3) | ✅ Seeded |
| `devices` | Your network devices | ✅ Empty (you add via CSV) |
| `device_links` | Device-to-link many-to-many | ✅ |
| `metrics` | Time-series monitoring data | ✅ |
| `alerts` | Alert tracking | ✅ |
| `alert_history` | Alert state changes | ✅ |
| `uploads` | CSV upload tracking | ✅ |
| `reports` | Generated reports | ✅ |
| `settings` | System configuration | ✅ Seeded |
| `audit_logs` | All user actions | ✅ |
| `notification_history` | Notification tracking | ✅ |
| `system_logs` | Application logs | ✅ |

**All indexes, foreign keys, and constraints are created automatically!**

---

## 📥 Upload Your Devices

### Step 1: Prepare Your CSV

Your CSV should have this format:

```csv
Username,IP Address,Device Name,Link,Network
admin,192.168.1.1,Core-Router,Link-1,Network-1
admin,192.168.1.2,Core-Switch,Link-1,Network-1
admin,192.168.2.1,Branch-Router,Link-2,Network-2
```

**Important:**
- **Username**: Your username (usually `admin`)
- **IP Address**: Device IP (IPv4 or IPv6)
- **Device Name**: Unique name for the device
- **Link**: One of: `Link-1`, `Link-2`, `Link-3` (or comma-separated for multiple)
- **Network**: One of: `Network-1`, `Network-2`, `Network-3`, `Network-4`, `Network-5`

### Step 2: Upload via Web Interface

1. Go to **Devices** page (click in left menu)
2. Click **"Import CSV"** button
3. Select your CSV file
4. Review the preview (shows validation)
5. Click **"Confirm Import"**
6. Your devices are now in the database!

### Step 3: Wait for Monitoring

**Wait 30 seconds!**

The monitoring engine runs every 30 seconds:
- Pings all devices (ICMP - measures latency and packet loss)
- Polls SNMP (measures bandwidth in/out)
- Updates database with metrics
- Sends real-time updates to browser

After 30 seconds:
- Go to **Dashboard**
- Charts will show data!
- Latency, packet loss, bandwidth all displayed
- Charts update automatically every 30 seconds

---

## 🔍 Verify Everything Works

### Check 1: Docker Services Running

```bash
docker compose ps
```

**Expected output (all should show "Up"):**
```
NAME            STATUS              PORTS
nms-api         Up 2 minutes        0.0.0.0:4000->4000/tcp
nms-frontend    Up 2 minutes        
nms-nginx       Up 2 minutes        0.0.0.0:80->80/tcp
nms-postgres    Up 2 minutes        0.0.0.0:5432->5432/tcp
```

### Check 2: Database Tables Created

```bash
# Connect to database
docker compose exec postgres psql -U nms nms

# Inside psql, run:
\dt

# Should show all 17 tables
# Press 'q' to exit table list
# Type: \q and Enter to exit psql
```

**Expected output:**
```
                List of relations
 Schema |        Name         | Type  | Owner 
--------+---------------------+-------+-------
 public | alert_history       | table | nms
 public | alerts              | table | nms
 public | audit_logs          | table | nms
 public | device_links        | table | nms
 public | devices             | table | nms
 public | links               | table | nms
 public | metrics             | table | nms
 public | networks            | table | nms
 ... (17 tables total)
```

### Check 3: Admin User Created

```bash
# Connect to database
docker compose exec postgres psql -U nms nms

# Check admin user exists
SELECT username, full_name, email FROM users;

# Should show:
#  username |        full_name        |        email         
# ----------+-------------------------+---------------------
#  admin    | System Administrator    | admin@corp.local

# Exit: \q
```

### Check 4: Networks and Links Seeded

```bash
# Connect to database
docker compose exec postgres psql -U nms nms

# Check networks
SELECT id, name FROM networks;

# Should show Network-1 through Network-5

# Check links
SELECT id, name FROM links;

# Should show Link-1 through Link-3

# Exit: \q
```

### Check 5: Monitoring Running

```bash
# Watch logs for monitoring cycles
docker compose logs -f api | grep "Monitoring cycle"

# Should see this every 30 seconds:
# [INFO] Monitoring cycle started for X devices

# Press Ctrl+C to stop watching
```

### Check 6: Can Access Web Interface

**Open browser:** `http://localhost`

Should show login page (not error page).

### Check 7: Can Login

Login with:
- Username: `admin`
- Password: (your password from `.env`)

Should take you to Dashboard.

### Check 8: Dashboard Works

After uploading devices and waiting 30 seconds:
- ✅ KPI cards show device counts
- ✅ Charts show data (not empty)
- ✅ No error messages
- ✅ Charts update automatically

**✅ If all 8 checks pass, everything is working perfectly!**

---

## 🗄️ Direct Database Access (For Verification)

If you want to check the database directly:

### Connect to PostgreSQL

```bash
# Method 1: Using docker exec
docker compose exec postgres psql -U nms nms

# Method 2: If you have psql installed locally
psql -h localhost -p 5432 -U nms -d nms
# Password: nms_secret
```

### Useful SQL Queries

```sql
-- List all tables
\dt

-- Describe a table
\d devices

-- Count devices
SELECT COUNT(*) FROM devices;

-- View networks
SELECT * FROM networks;

-- View links
SELECT * FROM links;

-- View users
SELECT username, full_name, email FROM users;

-- View roles
SELECT * FROM roles;

-- View recent metrics
SELECT device_id, timestamp, latency, packet_loss 
FROM metrics 
ORDER BY timestamp DESC 
LIMIT 10;

-- View alerts
SELECT * FROM alerts ORDER BY created_at DESC LIMIT 10;

-- View settings
SELECT * FROM settings;

-- Exit psql
\q
```

---

## 🔄 Replacing Test Data with Real Data

### To Replace Devices:

**Option 1: Delete and Re-import**
```bash
# Connect to database
docker compose exec postgres psql -U nms nms

# Delete all devices
DELETE FROM device_links;
DELETE FROM metrics;
DELETE FROM devices;

# Exit
\q

# Now upload your real CSV via web interface
```

**Option 2: Use Web Interface**
1. Go to **Devices** page
2. Select devices to delete
3. Click delete button
4. Upload your real CSV

### To Change Admin Password:

**Option 1: Via Web Interface**
1. Login as admin
2. Go to **Settings** or **Users** page
3. Change password through UI

**Option 2: Via Config File**
```bash
# Stop services
docker compose down

# Edit config
nano server/.env
# Change: ADMIN_PASSWORD=NewPassword123!

# Delete old admin user from database
docker compose up -d postgres
docker compose exec postgres psql -U nms nms -c "DELETE FROM users WHERE username='admin';"

# Start services (admin will be recreated with new password)
docker compose up -d
```

---

## 🛠️ Daily Operations

### Start Application

```bash
cd ~/nms-ritvik
docker compose up -d
```

### Stop Application

```bash
docker compose down
```

### Restart Application

```bash
docker compose restart
```

### View Logs

```bash
# All logs
docker compose logs -f

# Just API logs
docker compose logs -f api

# Just database logs
docker compose logs -f postgres
```

### Backup Database

```bash
# Create backup
docker compose exec postgres pg_dump -U nms nms > backup-$(date +%Y%m%d).sql

# Restore backup
docker compose exec -T postgres psql -U nms nms < backup-20240714.sql
```

### Clean Database (Start Fresh)

```bash
# Stop services
docker compose down

# Remove database volume
docker volume rm nms-ritvik_pgdata

# Start again (database will be recreated automatically)
docker compose up -d
```

---

## 🐛 Troubleshooting Ubuntu 24.04

### Issue: Docker Not Found

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Issue: Permission Denied

```bash
# Add to docker group
sudo usermod -aG docker $USER

# Apply group membership
newgrp docker

# Or logout and login
```

### Issue: Images Not Found

```bash
# Pull images (need internet)
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull nginx:alpine
```

### Issue: Port 80 in Use

```bash
# Check what's using port 80
sudo lsof -i :80

# Stop conflicting services
sudo systemctl stop apache2
sudo systemctl stop nginx

# Or change port
nano docker-compose.yml
# Change: "8080:80" instead of "80:80"
```

### Issue: Build Fails

```bash
# Check disk space
df -h

# Need at least 10GB free
# Clean Docker if needed
docker system prune -a
```

### Issue: Database Connection Failed

```bash
# Check postgres is running
docker compose ps

# Check logs
docker compose logs postgres

# Restart
docker compose restart postgres
sleep 10
docker compose restart api
```

### Issue: Migrations Don't Run

```bash
# Manually run migrations
docker compose exec api npm run migrate

# Or check logs
docker compose logs api | grep -i migration
```

---

## 📊 System Requirements (Ubuntu 24.04)

### Minimum:
- **OS**: Ubuntu 24.04 LTS
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disk**: 20 GB free
- **Docker**: 24.0+
- **Docker Compose**: v2.20+

### Recommended:
- **OS**: Ubuntu 24.04 LTS
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disk**: 50 GB free
- **Docker**: Latest version
- **Docker Compose**: Latest version

---

## ✅ Quick Start Summary

**After unzipping on Ubuntu 24.04:**

```bash
# 1. Navigate
cd ~/nms-ritvik

# 2. Configure
cp server/.env.example server/.env
nano server/.env  # Change JWT_SECRET and ADMIN_PASSWORD

# 3. Run setup
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh

# 4. Access
# Browser: http://localhost
# Login: admin / (your password)

# 5. Upload devices
# Devices page → Import CSV → Select file → Confirm

# 6. Wait 30 seconds
# Dashboard shows monitoring data!

# ✅ Done! Everything created automatically!
```

---

## 🎯 What Gets Created Automatically

✅ **Database**: PostgreSQL in Docker  
✅ **17 Tables**: All with indexes and constraints  
✅ **5 Networks**: Network-1 through Network-5  
✅ **3 Links**: Link-1 through Link-3  
✅ **3 Roles**: Admin, Operator, Viewer  
✅ **1 Admin User**: With your password  
✅ **Default Settings**: Polling interval, thresholds, etc.  
✅ **Monitoring Engine**: Starts automatically, polls every 30s  
✅ **Web Interface**: Ready at http://localhost  

**You just need to upload your device CSV and start monitoring!** 🚀

---

## 📞 Need Help?

Check these files:
- **AFTER_UNZIP_GUIDE.md** - Step-by-step after unzip
- **START_HERE_UBUNTU_VM.md** - Quick start
- **UBUNTU_VM_CHECKLIST.md** - Verification checklist
- **ZIP_AND_TRANSFER_GUIDE.md** - How to transfer

---

## 🎉 Success!

**Your NetPulse NMS on Ubuntu 24.04:**
- ✅ Database automatically created
- ✅ All tables automatically created
- ✅ Data automatically seeded
- ✅ Admin user automatically created
- ✅ Ready to monitor your network
- ✅ All offline - no internet needed!

**Just upload your devices and start monitoring!** 🚀
