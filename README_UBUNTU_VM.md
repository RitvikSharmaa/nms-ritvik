# 🚀 Quick Setup for Ubuntu VM (Offline/Air-gapped)

## TL;DR - Just Unzip and Run!

```bash
# 1. Unzip project
unzip nms-ritvik.zip
cd nms-ritvik

# 2. Run setup script
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh

# 3. Access application
# Open browser: http://localhost
# Login: admin / (password from .env file)
```

---

## What You Need (One-Time Setup on Connected Machine)

### Before Going Offline:

**On Ubuntu VM (while connected to internet):**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Pull required images
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull nginx:alpine

# Logout and login to apply docker group
```

---

## Transfer from Windows to Ubuntu VM

### Method 1: Shared Folder (VMware/VirtualBox)

```bash
# On Ubuntu VM
cp -r /mnt/hgfs/nms-ritvik ~/
# or
cp -r /media/sf_nms-ritvik ~/
```

### Method 2: USB Drive

```bash
# On Windows: Copy folder to USB
# On Ubuntu VM:
cp -r /media/usb/nms-ritvik ~/
```

### Method 3: SCP (while connected)

```bash
# On Ubuntu VM
scp -r user@windows-ip:/path/to/nms-ritvik ~/
```

### Method 4: Zip File

```bash
# On Windows: Right-click folder → Send to → Compressed folder
# Transfer nms-ritvik.zip to Ubuntu VM
# On Ubuntu VM:
unzip nms-ritvik.zip
```

---

## Setup on Ubuntu VM (Offline)

### Step 1: Configure Environment

```bash
cd ~/nms-ritvik

# Copy example env file
cp server/.env.example server/.env

# Edit configuration
nano server/.env
```

**Required changes in `.env`**:

```bash
# Change these values:
JWT_SECRET=your-super-secret-random-string-here-change-this
ADMIN_PASSWORD=YourStrongPassword123!

# Database config (leave as is for Docker)
DATABASE_URL=postgresql://nms:nms_secret@postgres:5432/nms

# Monitoring config (optional to change)
POLL_INTERVAL_SECONDS=30
SNMP_COMMUNITY=public
```

Press `Ctrl+O` to save, `Ctrl+X` to exit nano.

### Step 2: Run Setup Script

```bash
# Make script executable
chmod +x setup-ubuntu.sh

# Run setup (builds and starts everything)
./setup-ubuntu.sh
```

**What the script does:**
1. ✅ Checks Docker installation
2. ✅ Checks Docker permissions
3. ✅ Creates .env file if missing
4. ✅ Checks Docker images
5. ✅ Builds application images (3-5 minutes)
6. ✅ Starts all services
7. ✅ Waits for services to be healthy
8. ✅ Displays access information

### Step 3: Access Application

Open browser and navigate to:
```
http://localhost
```

**Login with:**
- Username: `admin`
- Password: (whatever you set in `server/.env` for `ADMIN_PASSWORD`)

---

## Manual Setup (if script fails)

### Option 1: Using Docker Compose

```bash
cd ~/nms-ritvik

# Build images
docker compose build

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Option 2: Step-by-Step

```bash
# 1. Start PostgreSQL
docker compose up -d postgres

# 2. Wait for database
sleep 10

# 3. Build and start API
docker compose up -d api

# 4. Build and start frontend
docker compose up -d frontend

# 5. Start nginx
docker compose up -d nginx

# 6. Check everything is running
docker compose ps
```

---

## Verification

### Check Services Are Running

```bash
docker compose ps
```

**Expected output:**
```
NAME            IMAGE           STATUS          PORTS
nms-api         nms-api         Up 2 minutes    0.0.0.0:4000->4000/tcp
nms-frontend    nms-frontend    Up 2 minutes    
nms-nginx       nginx:alpine    Up 2 minutes    0.0.0.0:80->80/tcp
nms-postgres    postgres:16     Up 2 minutes    0.0.0.0:5432->5432/tcp
```

### Check Logs

```bash
# All logs
docker compose logs

# Follow logs
docker compose logs -f

# Specific service
docker compose logs api
docker compose logs postgres
```

### Check API Health

```bash
curl http://localhost:4000/api/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"..."}
```

### Check Frontend

```bash
curl http://localhost
```

Should return HTML content.

---

## Upload Test Devices

### Step 1: Create Test CSV

Create file `test-devices.csv`:

```csv
Username,IP Address,Device Name,Link,Network
admin,8.8.8.8,Google-DNS,Link-1,Network-1
admin,1.1.1.1,Cloudflare-DNS,Link-1,Network-1
admin,192.168.1.1,Local-Router,Link-2,Network-2
admin,192.168.1.10,Local-Switch,Link-2,Network-2
admin,10.0.0.1,Corporate-Gateway,Link-3,Network-3
```

### Step 2: Upload via UI

1. Go to http://localhost
2. Login as admin
3. Navigate to **Devices** page
4. Click **Import CSV**
5. Select `test-devices.csv`
6. Review preview
7. Click **Confirm Import**

### Step 3: Wait for Monitoring

- Wait **30 seconds** for first monitoring cycle
- Go to **Dashboard** page
- Charts should start showing data!
- Check latency, packet loss, bandwidth

---

## Common Commands

### Application Management

```bash
# Start application
docker compose up -d

# Stop application
docker compose down

# Restart application
docker compose restart

# Restart specific service
docker compose restart api

# View running containers
docker compose ps

# View logs (follow mode)
docker compose logs -f

# View logs for specific service
docker compose logs -f api
```

### Database Operations

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U nms -d nms

# Inside psql:
\dt                           # List tables
\d devices                    # Describe devices table
SELECT COUNT(*) FROM devices; # Count devices
SELECT * FROM settings;       # View settings
\q                           # Quit
```

### System Monitoring

```bash
# Docker resource usage
docker stats

# Disk usage
docker system df

# Container details
docker compose ps --format json
```

---

## Troubleshooting

### Issue: Permission Denied

```bash
# Error: permission denied while trying to connect to Docker daemon

# Solution: Add user to docker group
sudo usermod -aG docker $USER

# Then logout and login again, or:
newgrp docker
```

### Issue: Port Already in Use

```bash
# Error: bind: address already in use (port 80)

# Solution 1: Stop conflicting service
sudo systemctl stop apache2
sudo systemctl stop nginx

# Solution 2: Change port in docker-compose.yml
nano docker-compose.yml
# Change: "8080:80" instead of "80:80"

# Then restart
docker compose down
docker compose up -d
```

### Issue: Database Connection Failed

```bash
# Check if postgres is running
docker compose ps

# Check postgres logs
docker compose logs postgres

# Restart database
docker compose restart postgres

# Wait and restart API
sleep 10
docker compose restart api
```

### Issue: Images Not Found

```bash
# Error: No such image: postgres:16-alpine

# Solution: Pull images (if online)
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull nginx:alpine

# Or load from tar files (if offline)
docker load -i postgres-16-alpine.tar
docker load -i node-20-alpine.tar
docker load -i nginx-alpine.tar
```

### Issue: Build Fails

```bash
# Check Docker has enough space
docker system df

# Clean up old images/containers
docker system prune -a

# Rebuild
docker compose build --no-cache
```

### Issue: Frontend Shows Error

```bash
# Check if API is running
curl http://localhost:4000/api/health

# Check API logs
docker compose logs api

# Restart frontend
docker compose restart frontend nginx
```

### Issue: Monitoring Not Running

```bash
# Check API logs for monitoring cycles
docker compose logs -f api | grep "Monitoring cycle"

# Should see message every 30 seconds:
# [INFO] Monitoring cycle started for X devices

# If not appearing:
# 1. Check devices are uploaded
# 2. Check POLL_INTERVAL_SECONDS in .env
# 3. Restart API: docker compose restart api
```

---

## Stopping the Application

### Temporary Stop (keeps data)

```bash
docker compose down
```

### Stop and Remove All Data

```bash
# WARNING: This deletes the database!
docker compose down -v
```

### Restart After Stop

```bash
docker compose up -d
```

---

## Data Backup

### Backup Database

```bash
# Backup to SQL file
docker compose exec postgres pg_dump -U nms nms > backup-$(date +%Y%m%d).sql

# Restore from backup
docker compose exec -T postgres psql -U nms nms < backup-20260714.sql
```

### Backup Entire Application

```bash
# Stop application
docker compose down

# Backup project folder
cd ~
tar -czf nms-backup-$(date +%Y%m%d).tar.gz nms-ritvik/

# Restart application
cd nms-ritvik
docker compose up -d
```

---

## Performance Tuning

### For 500-1000 Devices

Edit `server/.env`:

```bash
# Increase worker threads
WORKER_THREADS=5

# Adjust polling interval if needed
POLL_INTERVAL_SECONDS=60

# Reduce retention for better performance
RETENTION_DAYS=7
```

Restart API:
```bash
docker compose restart api
```

---

## Quick Reference

### File Locations

```
~/nms-ritvik/                      # Project root
~/nms-ritvik/server/.env           # Configuration file
~/nms-ritvik/docker-compose.yml    # Docker services config
~/nms-ritvik/setup-ubuntu.sh       # Setup script
```

### Important URLs

```
http://localhost              # Frontend (login page)
http://localhost/api/docs     # API documentation (Swagger)
http://localhost:4000/api/health  # API health check
```

### Default Credentials

```
Username: admin
Password: (check server/.env file for ADMIN_PASSWORD)
```

### Log Files

```bash
# View all logs
docker compose logs

# API logs only
docker compose logs api

# PostgreSQL logs
docker compose logs postgres

# Follow logs (real-time)
docker compose logs -f
```

---

## Need More Help?

Check these detailed guides:

- **UBUNTU_VM_SETUP.md** - Complete step-by-step guide
- **OFFLINE_DEPLOYMENT_GUIDE.md** - Detailed deployment guide  
- **QUICK_START.md** - Quick start guide
- **TESTING_GUIDE.md** - Testing procedures
- **PROJECT_COMPLETION_STATUS.md** - Feature checklist

---

## Summary

**Offline Ubuntu VM Setup in 3 Steps:**

1. ✅ Transfer project folder to Ubuntu VM
2. ✅ Configure `server/.env` file
3. ✅ Run `./setup-ubuntu.sh`

**Done!** Access http://localhost and start monitoring! 🚀
