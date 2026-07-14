# 🚀 Ubuntu VM Setup Guide - Complete Offline Package

## Goal: Unzip → Configure → Run (No Internet Needed!)

This guide will help you run the NetPulse NMS on your **offline/air-gapped Ubuntu VM** with zero internet access.

---

## Prerequisites (Must Be Done on Connected Machine)

### On Your Windows Machine (Connected to Internet)

1. **Install Docker on Ubuntu VM** (before going offline)
2. **Transfer this project folder** to Ubuntu VM
3. **Pull Docker images** on Ubuntu VM while connected

---

## Step 1: Prepare Ubuntu VM (While Connected)

### 1.1 Install Docker & Docker Compose

```bash
# Update system
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 1.2 Install Required System Packages

```bash
# Install build tools (for native modules)
sudo apt install -y build-essential python3 python3-pip

# Install network tools for ICMP
sudo apt install -y iputils-ping net-tools

# Install PostgreSQL client (optional, for debugging)
sudo apt install -y postgresql-client
```

### 1.3 Pull Docker Images

```bash
# Pull required images while connected
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull nginx:alpine
```

### 1.4 Save Docker Images to Tarballs

```bash
# Create a directory for Docker images
mkdir -p ~/docker-images

# Save images
docker save postgres:16-alpine -o ~/docker-images/postgres-16-alpine.tar
docker save node:20-alpine -o ~/docker-images/node-20-alpine.tar
docker save nginx:alpine -o ~/docker-images/nginx-alpine.tar

# Compress (optional, saves space)
cd ~/docker-images
tar -czf docker-images.tar.gz *.tar
```

---

## Step 2: Transfer Files to Ubuntu VM

### 2.1 What to Transfer

From Windows to Ubuntu VM, transfer:

1. **Project folder** (entire `nms-ritvik` directory)
2. **Docker images** (`docker-images.tar.gz` from Step 1.4)

### 2.2 Transfer Methods

**Option A: USB Drive**
```bash
# On Windows: Copy to USB
# On Ubuntu VM: Copy from USB to home directory
cp -r /media/usb/nms-ritvik ~/
cp /media/usb/docker-images.tar.gz ~/
```

**Option B: Network Share (while connected)**
```bash
# On Ubuntu VM
scp -r user@windows-machine:/path/to/nms-ritvik ~/
scp user@windows-machine:/path/to/docker-images.tar.gz ~/
```

**Option C: Shared Folder (VM)**
```bash
# If using VirtualBox/VMware shared folders
cp -r /mnt/shared/nms-ritvik ~/
cp /mnt/shared/docker-images.tar.gz ~/
```

---

## Step 3: Setup on Ubuntu VM (Offline)

### 3.1 Load Docker Images

```bash
# Extract docker images
cd ~
tar -xzf docker-images.tar.gz

# Load images into Docker
docker load -i postgres-16-alpine.tar
docker load -i node-20-alpine.tar
docker load -i nginx-alpine.tar

# Verify images loaded
docker images
```

### 3.2 Navigate to Project

```bash
cd ~/nms-ritvik
```

### 3.3 Configure Environment Variables

```bash
# Copy example env file
cp server/.env.example server/.env

# Edit the env file
nano server/.env
```

**Required Configuration** (in `server/.env`):

```bash
# Database Configuration
DATABASE_URL=postgresql://nms_user:nms_password@postgres:5432/nms_db
DB_HOST=postgres
DB_PORT=5432
DB_USER=nms_user
DB_PASSWORD=nms_password
DB_NAME=nms_db

# Auth Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=8h

# Admin Account (First-time setup)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123!
ADMIN_EMAIL=admin@localhost

# Monitoring Configuration
POLL_INTERVAL_SECONDS=30
ICMP_TIMEOUT_SECONDS=5
SNMP_COMMUNITY=public
SNMP_VERSION=v2c
SNMP_TIMEOUT=5000

# Retention
RETENTION_DAYS=30

# Server Configuration
NODE_ENV=production
PORT=4000
```

**🔒 Security Note**: Change `JWT_SECRET` and `ADMIN_PASSWORD` to strong values!

### 3.4 Build Docker Images

```bash
# Build all services
docker compose build

# This will:
# 1. Build frontend (Vite production build)
# 2. Build backend (TypeScript compilation)
# 3. Configure Nginx
```

**Expected Output**:
```
[+] Building 120.5s (45/45) FINISHED
 => [api internal] load build definition from Dockerfile
 => [frontend internal] load build definition from Dockerfile.frontend
 ...
```

---

## Step 4: Start the Application

### 4.1 Start All Services

```bash
# Start in detached mode
docker compose up -d

# Check status
docker compose ps
```

**Expected Output**:
```
NAME                IMAGE               STATUS              PORTS
nms-nginx           nms-nginx           Up 10 seconds       0.0.0.0:80->80/tcp
nms-frontend        nms-frontend        Up 10 seconds       
nms-api             nms-api             Up 10 seconds       0.0.0.0:4000->4000/tcp
nms-postgres        postgres:16-alpine  Up 10 seconds       0.0.0.0:5432->5432/tcp
```

### 4.2 Verify Services

```bash
# Check logs
docker compose logs -f

# Check API health
curl http://localhost:4000/api/health

# Check frontend
curl http://localhost
```

### 4.3 Access the Application

Open browser and go to:
```
http://localhost
```

**Login Credentials**:
- Username: `admin` (from ADMIN_USERNAME in .env)
- Password: `Admin123!` (from ADMIN_PASSWORD in .env)

---

## Step 5: Verify Monitoring is Working

### 5.1 Check Backend Logs

```bash
# Watch API logs for monitoring cycles
docker compose logs -f api | grep "Monitoring cycle"

# Expected output every 30 seconds:
# [INFO] Monitoring cycle started for X devices
```

### 5.2 Upload Test Devices

1. Go to **Devices** page
2. Click **Import CSV**
3. Create a test CSV:

```csv
Username,IP Address,Device Name,Link,Network
admin,8.8.8.8,Google-DNS,Link-1,Network-1
admin,1.1.1.1,Cloudflare-DNS,Link-1,Network-1
admin,192.168.1.1,Local-Gateway,Link-2,Network-2
```

4. Upload and confirm import
5. Wait 30 seconds for first monitoring cycle
6. Check Dashboard - charts should populate with data!

---

## Step 6: Troubleshooting

### Issue 1: Docker Images Not Found

**Symptom**:
```
Error response from daemon: No such image: postgres:16-alpine
```

**Solution**:
```bash
# Load images again
cd ~/docker-images
docker load -i postgres-16-alpine.tar
docker load -i node-20-alpine.tar
docker load -i nginx-alpine.tar
```

### Issue 2: Permission Denied (Docker)

**Symptom**:
```
permission denied while trying to connect to the Docker daemon socket
```

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, or:
newgrp docker

# Or run with sudo (not recommended)
sudo docker compose up -d
```

### Issue 3: Port Already in Use

**Symptom**:
```
Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use
```

**Solution**:
```bash
# Check what's using port 80
sudo lsof -i :80

# Option A: Stop the conflicting service
sudo systemctl stop apache2  # or nginx

# Option B: Change port in docker-compose.yml
# Edit: ports: "8080:80" instead of "80:80"
nano docker-compose.yml
```

### Issue 4: Database Connection Failed

**Symptom**:
```
Error: connect ECONNREFUSED postgres:5432
```

**Solution**:
```bash
# Check if postgres container is running
docker compose ps

# Check postgres logs
docker compose logs postgres

# Restart services
docker compose down
docker compose up -d
```

### Issue 5: ICMP Ping Not Working

**Symptom**:
```
Error: ping requires NET_RAW capability
```

**Solution**:
```bash
# Already configured in docker-compose.yml
# Verify cap_add is present:
grep -A5 "cap_add" docker-compose.yml

# Should show:
#   cap_add:
#     - NET_RAW

# Restart if needed
docker compose restart api
```

### Issue 6: SNMP Polling Fails

**Symptom**:
```
SNMP timeout for device X.X.X.X
```

**Solution**:
```bash
# Check SNMP community string in .env
cat server/.env | grep SNMP_COMMUNITY

# Update if needed
nano server/.env
# Change: SNMP_COMMUNITY=your_community_string

# Restart API
docker compose restart api
```

---

## Step 7: Stopping and Restarting

### Stop Application

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: Deletes database!)
docker compose down -v
```

### Restart Application

```bash
# Start again
docker compose up -d

# Or restart specific service
docker compose restart api
```

### View Logs

```bash
# All logs
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 api
```

---

## Step 8: Data Backup

### Backup Database

```bash
# Backup PostgreSQL data
docker exec nms-postgres pg_dump -U nms_user nms_db > backup.sql

# Or backup entire data volume
docker compose down
sudo tar -czf postgres-data-backup.tar.gz -C /var/lib/docker/volumes/nms-ritvik_postgres-data .
docker compose up -d
```

### Restore Database

```bash
# Restore from SQL dump
docker exec -i nms-postgres psql -U nms_user nms_db < backup.sql

# Or restore volume
docker compose down
sudo rm -rf /var/lib/docker/volumes/nms-ritvik_postgres-data/*
sudo tar -xzf postgres-data-backup.tar.gz -C /var/lib/docker/volumes/nms-ritvik_postgres-data/
docker compose up -d
```

---

## Step 9: System Performance

### Monitor Resource Usage

```bash
# Docker stats
docker stats

# Disk usage
docker system df

# Container logs size
du -sh /var/lib/docker/containers/*
```

### Clean Up Unused Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```

---

## Quick Reference Commands

### Application Management

```bash
# Start application
docker compose up -d

# Stop application
docker compose down

# Restart application
docker compose restart

# View logs
docker compose logs -f

# Check status
docker compose ps

# Access container shell
docker exec -it nms-api sh
docker exec -it nms-postgres psql -U nms_user nms_db
```

### Database Operations

```bash
# Connect to database
docker exec -it nms-postgres psql -U nms_user nms_db

# SQL commands inside psql:
\dt                           # List tables
\d devices                    # Describe table
SELECT COUNT(*) FROM devices; # Count devices
SELECT * FROM settings;       # View settings
\q                            # Quit
```

### File Locations

```bash
# Project files
~/nms-ritvik/

# Environment config
~/nms-ritvik/server/.env

# Docker compose config
~/nms-ritvik/docker-compose.yml

# Database volume
/var/lib/docker/volumes/nms-ritvik_postgres-data/

# Logs
docker compose logs
```

---

## Step 10: Verification Checklist

After setup, verify everything works:

- [ ] Docker images loaded (`docker images`)
- [ ] Services running (`docker compose ps`)
- [ ] Frontend accessible (http://localhost)
- [ ] Login works (admin credentials)
- [ ] Database connected (no errors in logs)
- [ ] CSV upload works (Devices page)
- [ ] Monitoring running (logs show "Monitoring cycle" every 30s)
- [ ] Charts display data (Dashboard page after 30s)
- [ ] Alerts appear (if thresholds exceeded)
- [ ] Reports export (Reports page)
- [ ] Real-time updates work (charts update every 30s)

---

## Summary: Complete Workflow

### On Windows (Connected)
1. ✅ Transfer entire `nms-ritvik` folder to Ubuntu VM

### On Ubuntu VM (Connected)
1. ✅ Install Docker + Docker Compose
2. ✅ Install system dependencies
3. ✅ Pull Docker images (postgres, node, nginx)
4. ✅ Save images to tarballs
5. ✅ **Go offline** (disconnect network)

### On Ubuntu VM (Offline)
1. ✅ Load Docker images from tarballs
2. ✅ Configure `server/.env` file
3. ✅ Run `docker compose build`
4. ✅ Run `docker compose up -d`
5. ✅ Access http://localhost
6. ✅ Login as admin
7. ✅ Upload devices CSV
8. ✅ Watch monitoring work! 🎉

---

## Expected Timeline

| Task | Time |
|------|------|
| Setup Ubuntu VM (connected) | 10 minutes |
| Transfer files | 5 minutes |
| Configure .env | 2 minutes |
| Build Docker images | 3-5 minutes |
| Start application | 1 minute |
| First monitoring cycle | 30 seconds |
| **Total** | **~20 minutes** |

---

## Need Help?

Check these files for more details:
- `OFFLINE_DEPLOYMENT_GUIDE.md` - Detailed deployment guide
- `UBUNTU_OFFLINE_SETUP.md` - Ubuntu-specific instructions
- `UBUNTU_CHECKLIST.md` - Step-by-step checklist
- `TESTING_GUIDE.md` - Testing procedures
- `QUICK_START.md` - Quick start guide
- `PROJECT_COMPLETION_STATUS.md` - Complete feature list

---

## ✅ You're Ready!

Your NetPulse NMS will work completely offline on Ubuntu VM after following this guide. No internet needed after initial setup! 🚀
