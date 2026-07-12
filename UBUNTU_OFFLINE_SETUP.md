# Ubuntu Offline Setup Guide

## 🎯 Complete Guide for Ubuntu Air-Gapped Deployment

This guide is specifically for **Ubuntu 20.04+ / 22.04+ systems** in offline/air-gapped environments.

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [On Connected Ubuntu Machine (Preparation)](#on-connected-ubuntu-machine-preparation)
3. [Transfer Package](#transfer-package)
4. [On Offline Ubuntu VM (Installation)](#on-offline-ubuntu-vm-installation)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

### Minimum Requirements
- **OS**: Ubuntu 20.04 LTS or 22.04 LTS (64-bit)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 100GB minimum, 500GB recommended
- **CPU**: 4 cores minimum
- **User**: sudo privileges required

### Both Machines Need
- USB drive or secure transfer method
- Same Ubuntu version (20.04 or 22.04) for binary compatibility

---

## 2. On Connected Ubuntu Machine (Preparation)

### Step 1: Install Required Tools

```bash
# Update package lists
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install other tools
sudo apt-get install -y \
    git \
    wget \
    curl \
    tar \
    gzip \
    nodejs \
    npm
```

### Step 2: Clone or Copy Project

```bash
# If you have the project locally
cd /path/to/nms-ritvik

# OR clone from repository
git clone <your-repo-url> nms-ritvik
cd nms-ritvik
```

### Step 3: Run the Package Creation Script

```bash
# Make script executable
chmod +x create-offline-package.sh

# Run the script (takes 30-60 minutes)
./create-offline-package.sh

# OR run manually with each step visible:
./create-offline-package.sh 2>&1 | tee package-creation.log
```

### What the Script Does:
1. ✅ Downloads Node.js v20.11.0 for Linux x64
2. ✅ Installs all 440+ frontend NPM packages
3. ✅ Installs all 180+ backend NPM packages
4. ✅ Downloads Docker images (PostgreSQL, Nginx, Node)
5. ✅ Builds custom Docker images
6. ✅ Downloads Ubuntu system packages (.deb files)
7. ✅ Creates checksums
8. ✅ Packages everything into single .tar.gz file

### Expected Output:
```
nms-offline-package-YYYYMMDD-HHMMSS.tar.gz (~1-1.5 GB)
```

### Step 4: Verify Package Created

```bash
# Check file exists
ls -lh nms-offline-package-*.tar.gz

# Should show something like:
# -rw-r--r-- 1 user user 1.2G Jan 15 10:30 nms-offline-package-20240115-103000.tar.gz
```

---

## 3. Transfer Package

### Option A: USB Drive

```bash
# On connected machine
# Insert USB drive (usually mounts at /media/$USER/<drive-name>)

# Find USB mount point
lsblk
# Or
df -h | grep media

# Copy package to USB
cp nms-offline-package-*.tar.gz /media/$USER/<drive-name>/

# Safely unmount
sync
sudo umount /media/$USER/<drive-name>

# Remove USB, insert into offline VM
```

### Option B: SCP (if there's a secure network)

```bash
# From connected machine to offline VM
scp nms-offline-package-*.tar.gz user@offline-vm-ip:/tmp/
```

### Option C: Shared Folder (VirtualBox/VMware)

```bash
# Copy to shared folder
cp nms-offline-package-*.tar.gz /path/to/shared/folder/
```

---

## 4. On Offline Ubuntu VM (Installation)

### Step 1: Extract Package

```bash
# Go to where you copied the file
cd /tmp  # or wherever you copied it

# Extract
tar -xzf nms-offline-package-*.tar.gz

# Enter directory
cd nms-offline-package-*/

# Verify contents
ls -la
```

### Step 2: Install Docker (Offline)

```bash
# First, check if Docker is already installed
docker --version

# If not installed, you need to prepare Docker .deb files on connected machine
# See "Docker Offline Installation" section below
```

### Step 3: Load Docker Images

```bash
# Load all 5 Docker images
docker load -i postgres-16-alpine.tar
docker load -i nginx-1.27-alpine.tar
docker load -i node-20-alpine.tar
docker load -i nms-api.tar
docker load -i nms-frontend.tar

# Verify images loaded
docker images

# Expected output:
# REPOSITORY    TAG           IMAGE ID       SIZE
# postgres      16-alpine     xxxx           240MB
# nginx         1.27-alpine   xxxx           45MB
# node          20-alpine     xxxx           180MB
# nms-api       latest        xxxx           200MB
# nms-frontend  latest        xxxx           180MB
```

### Step 4: Install System Dependencies

```bash
# Install .deb packages (optional - only if rebuilding from source)
cd system-packages-debian
sudo dpkg -i *.deb

# If there are dependency errors, fix them:
sudo apt-get install -f

cd ..
```

### Step 5: Prepare Application

```bash
# Go to project directory
cd nms-ritvik

# Create environment file
cp server/.env.example server/.env

# Edit configuration
nano server/.env
# OR
vi server/.env
```

### Critical Settings in .env:

```bash
# PostgreSQL connection
DATABASE_URL=postgres://nms:nms_secret@postgres:5432/nms

# Security (CHANGE THESE!)
JWT_SECRET=PLEASE_CHANGE_THIS_TO_A_VERY_LONG_RANDOM_STRING_AT_LEAST_64_CHARACTERS
ADMIN_PASSWORD=YourSecurePassword123!

# SNMP Configuration (adjust for your network devices)
SNMP_COMMUNITY=public
SNMP_PORT=161
SNMP_TIMEOUT_MS=1500

# Monitoring Settings
POLL_INTERVAL_SECONDS=30
ICMP_PACKET_COUNT=4
ICMP_TIMEOUT_SECONDS=2

# CORS Origin (if frontend is on different host)
CORS_ORIGIN=http://localhost
```

### Step 6: Start Services

```bash
# Start all containers
docker compose up -d

# This starts:
# - PostgreSQL database (port 5432)
# - Backend API (port 4000)
# - Frontend app (port 3000)
# - Nginx reverse proxy (port 80)
```

### Step 7: Wait for Initialization

```bash
# Watch logs (takes 30-60 seconds for DB migrations)
docker compose logs -f

# Look for these messages:
# ✓ "Migrations completed successfully"
# ✓ "NMS API listening on :4000"
# ✓ "Monitoring scheduler started"

# Press Ctrl+C to stop watching logs
```

### Step 8: Verify Deployment

```bash
# Check all containers are running
docker compose ps

# Expected output (all should be "Up" or "Up (healthy)"):
# NAME              STATUS
# nms-postgres      Up (healthy)
# nms-api           Up (healthy)
# nms-frontend      Up
# nms-nginx         Up

# Test API health
curl http://localhost/api/health

# Expected response:
# {"status":"healthy","database":"connected",...}

# Test frontend
curl -I http://localhost/

# Expected: HTTP/1.1 200 OK
```

---

## 5. Verification

### Full System Check

```bash
#!/bin/bash
# save as verify-deployment.sh

echo "=== NMS Deployment Verification ==="
echo ""

# 1. Docker containers
echo "1. Checking Docker containers..."
docker compose ps
echo ""

# 2. API health
echo "2. Checking API health..."
curl -s http://localhost/api/health | python3 -m json.tool
echo ""

# 3. Database tables
echo "3. Checking database tables..."
docker compose exec -T postgres psql -U nms -d nms -c "\dt"
echo ""

# 4. Monitoring logs
echo "4. Checking monitoring logs (last 20 lines)..."
docker compose logs --tail=20 api | grep -i "monitoring cycle"
echo ""

# 5. Network connectivity from container
echo "5. Testing network connectivity from API container..."
docker compose exec -T api ping -c 2 8.8.8.8 || echo "Internet not available (expected in air-gap)"
echo ""

echo "=== Verification Complete ==="
```

```bash
# Make executable and run
chmod +x verify-deployment.sh
./verify-deployment.sh
```

### Access Application

```bash
# From the Ubuntu VM itself:
firefox http://localhost &

# Or from another machine on the same network:
# Get VM's IP address
ip addr show | grep "inet " | grep -v 127.0.0.1

# Then access from browser:
http://<vm-ip-address>
```

### Default Login Credentials

```
Username: admin
Password: (whatever you set in server/.env ADMIN_PASSWORD)
```

---

## 6. Troubleshooting

### Issue: Docker not installed on offline VM

**Solution**: Prepare Docker .deb packages on connected machine

```bash
# ON CONNECTED MACHINE:
mkdir docker-debs
cd docker-debs

# Download Docker packages for Ubuntu
apt-get download \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# Download dependencies
apt-get download $(apt-cache depends docker-ce | grep Depends | cut -d: -f2)

# Package them
cd ..
tar -czf docker-debs.tar.gz docker-debs/

# Transfer docker-debs.tar.gz to offline VM

# ON OFFLINE VM:
tar -xzf docker-debs.tar.gz
cd docker-debs
sudo dpkg -i *.deb
sudo apt-get install -f  # Fix any missing dependencies
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### Issue: Permission denied when running docker commands

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, OR:
newgrp docker

# Verify
docker ps
```

### Issue: Port 80 already in use

```bash
# Check what's using port 80
sudo lsof -i :80

# Option 1: Stop the service
sudo systemctl stop apache2  # or nginx, or whatever

# Option 2: Change NMS port in docker-compose.yml
nano docker-compose.yml

# Change:
# nginx:
#   ports:
#     - "8080:80"  # Use port 8080 instead

# Then access at http://localhost:8080
```

### Issue: Container keeps restarting

```bash
# Check logs for specific container
docker compose logs api
docker compose logs postgres
docker compose logs frontend

# Common causes:
# - Database not ready: wait 30 seconds
# - Environment variable missing: check server/.env
# - Port conflict: check with 'sudo lsof -i :<port>'
```

### Issue: Cannot ping devices from container

```bash
# Test ping from container
docker compose exec api ping -c 4 192.168.1.1

# If fails, check:

# 1. Verify NET_RAW capability (should already be set)
docker compose exec api capsh --print | grep cap_net_raw

# 2. Check container can reach host network
docker compose exec api ip route

# 3. Test from host first
ping -c 4 192.168.1.1

# 4. Check firewall rules
sudo iptables -L -n
```

### Issue: Frontend shows blank page

```bash
# Check browser console (F12) for errors

# Check frontend logs
docker compose logs frontend

# Check nginx logs
docker compose logs nginx

# Try accessing API directly
curl http://localhost/api/health

# If API works but frontend doesn't, rebuild frontend
docker compose up -d --force-recreate frontend
```

### Issue: Database connection failed

```bash
# Check PostgreSQL is running
docker compose exec postgres pg_isready -U nms

# Check connection from API container
docker compose exec api psql postgresql://nms:nms_secret@postgres:5432/nms -c "SELECT 1"

# Check DATABASE_URL in .env matches docker-compose.yml
grep DATABASE_URL server/.env
grep POSTGRES docker-compose.yml
```

---

## Docker Offline Installation (Detailed)

### Prepare on Connected Ubuntu Machine

```bash
#!/bin/bash
# Script to download Docker for offline installation

# Create directory
mkdir docker-offline-install
cd docker-offline-install

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o docker.gpg

# Get Ubuntu version
UBUNTU_VERSION=$(lsb_release -cs)
echo "Ubuntu version: $UBUNTU_VERSION"

# Add Docker repository
echo "deb [arch=amd64] https://download.docker.com/linux/ubuntu $UBUNTU_VERSION stable" > docker.list

# Download Docker packages and dependencies
apt-get download \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
    docker-ce-rootless-extras

# Download all dependencies
for pkg in docker-ce docker-ce-cli containerd.io; do
    apt-cache depends $pkg | \
    grep -E "Depends|PreDepends" | \
    cut -d: -f2 | \
    tr -d ' ' | \
    xargs apt-get download 2>/dev/null || true
done

# Create installation script
cat > install-docker-offline.sh << 'INSTALL_SCRIPT'
#!/bin/bash
set -e

echo "Installing Docker offline..."

# Install all .deb packages
sudo dpkg -i *.deb 2>/dev/null || true

# Fix any dependency issues
sudo apt-get install -f

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER

echo "Docker installed successfully!"
echo "Please log out and back in for group changes to take effect"
echo "Or run: newgrp docker"
INSTALL_SCRIPT

chmod +x install-docker-offline.sh

# Package everything
cd ..
tar -czf docker-offline-install.tar.gz docker-offline-install/

echo "✓ Package created: docker-offline-install.tar.gz"
echo "✓ Transfer to offline Ubuntu VM and run:"
echo "  tar -xzf docker-offline-install.tar.gz"
echo "  cd docker-offline-install"
echo "  ./install-docker-offline.sh"
```

### Install on Offline Ubuntu VM

```bash
# Extract package
tar -xzf docker-offline-install.tar.gz
cd docker-offline-install

# Run installation script
./install-docker-offline.sh

# Verify
docker --version
docker compose version

# Test
docker run hello-world
```

---

## System Package List (Ubuntu-Specific)

### Complete List of Required .deb Packages

```
# Core dependencies
iputils-ping                    # ICMP ping utility
net-snmp                        # SNMP runtime
libsnmp-dev                     # SNMP development headers
libsnmp40                       # SNMP libraries
snmp                            # SNMP utilities

# Build tools (only if rebuilding from source)
build-essential                 # Meta-package for build tools
gcc                             # C compiler
g++                             # C++ compiler
make                            # Build automation
cmake                           # Build system
pkg-config                      # Package configuration

# Python (for node-gyp)
python3                         # Python runtime
python3-dev                     # Python development headers
python3-pip                     # Python package manager

# PostgreSQL client
libpq-dev                       # PostgreSQL development files
libpq5                          # PostgreSQL client library

# OpenSSL
libssl-dev                      # OpenSSL development
libssl3                         # OpenSSL runtime (Ubuntu 22.04)
# OR
libssl1.1                       # OpenSSL runtime (Ubuntu 20.04)

# Additional utilities
curl                            # HTTP client
wget                            # Download utility
git                             # Version control (optional)
net-tools                       # Network utilities
```

---

## Quick Reference Commands

### Start/Stop Services

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f api
docker compose logs -f postgres
```

### Database Access

```bash
# Connect to database
docker compose exec postgres psql -U nms -d nms

# Run SQL query
docker compose exec postgres psql -U nms -d nms -c "SELECT COUNT(*) FROM devices;"

# Backup database
docker compose exec postgres pg_dump -U nms nms > backup.sql

# Restore database
cat backup.sql | docker compose exec -T postgres psql -U nms -d nms
```

### Container Management

```bash
# List containers
docker compose ps

# Restart specific container
docker compose restart api

# View resource usage
docker stats

# Execute command in container
docker compose exec api sh
```

---

## Performance Tuning for Ubuntu VM

### Increase Docker Resources

```bash
# Check current limits
docker info | grep -E "CPUs|Memory"

# If using Docker Desktop, adjust in settings
# If using Docker Engine, edit:
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "default-shm-size": "2G",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
# Restart Docker
sudo systemctl restart docker
```

### Optimize PostgreSQL

```bash
# Edit docker-compose.yml to add:
services:
  postgres:
    environment:
      - POSTGRES_INITDB_ARGS="-E UTF8 --locale=en_US.UTF-8"
    command: >
      postgres
      -c max_connections=100
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
```

---

## ✅ Success Checklist

- [ ] Docker images loaded (5 images visible with `docker images`)
- [ ] All containers running (`docker compose ps` shows all Up)
- [ ] API health returns 200 (`curl http://localhost/api/health`)
- [ ] Database has 17 tables (`docker compose exec postgres psql -U nms -d nms -c "\dt"`)
- [ ] Frontend loads in browser (`http://localhost`)
- [ ] Can log in as admin
- [ ] Dashboard shows 5 networks
- [ ] Monitoring logs appear every 30s (`docker compose logs api | grep "Monitoring cycle"`)
- [ ] No errors in logs (`docker compose logs | grep -i error`)

---

## 🎉 You're Done!

Your Enterprise NMS is now running on Ubuntu in a completely offline environment!

**Next Steps:**
1. Upload device inventory via CSV/XLSX
2. Configure alert thresholds in Settings
3. Start monitoring your network

For questions or issues, see the troubleshooting section above or check the documentation files.
