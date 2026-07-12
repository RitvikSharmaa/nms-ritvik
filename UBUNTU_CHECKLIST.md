# Ubuntu Offline Deployment Checklist

## 📋 Complete Step-by-Step Checklist

Use this checklist to ensure nothing is missed during offline deployment.

---

## Phase 1: On Connected Ubuntu Machine (Preparation)

### ☐ Prerequisites
- [ ] Ubuntu 20.04 or 22.04 LTS installed
- [ ] Internet connection available
- [ ] At least 50GB free disk space
- [ ] sudo privileges

### ☐ Install Required Tools
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git wget curl
sudo usermod -aG docker $USER
newgrp docker
```

- [ ] Docker installed: `docker --version`
- [ ] Docker Compose installed: `docker compose version`
- [ ] Git installed: `git --version`
- [ ] Can run docker without sudo: `docker ps`

### ☐ Get Project Source Code
```bash
# Option 1: Clone from repository
git clone <repo-url> nms-ritvik
cd nms-ritvik

# Option 2: Already have it
cd /path/to/nms-ritvik
```

- [ ] Project directory exists
- [ ] Can see: `ls -la` shows files

### ☐ Run Package Creation Script
```bash
chmod +x create-offline-package.sh
./create-offline-package.sh
```

**This takes 30-60 minutes. Coffee time! ☕**

- [ ] Script started without errors
- [ ] Node.js downloaded
- [ ] Frontend dependencies installed (440+ packages)
- [ ] Backend dependencies installed (180+ packages)
- [ ] Docker images pulled (5 images)
- [ ] Custom images built
- [ ] System packages downloaded
- [ ] Final package created: `nms-offline-package-*.tar.gz`

### ☐ Verify Package
```bash
ls -lh nms-offline-package-*.tar.gz
# Should be ~1-1.5 GB
```

- [ ] Package file exists
- [ ] Size is between 800MB - 2GB
- [ ] Checksums file exists

### ☐ Optional: Create Docker Offline Installer
```bash
mkdir docker-offline-install
cd docker-offline-install

apt-get download \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

cd ..
tar -czf docker-offline-install.tar.gz docker-offline-install/
```

- [ ] Docker packages downloaded
- [ ] Package created: `docker-offline-install.tar.gz`

---

## Phase 2: Transfer to Offline Machine

### ☐ Prepare Transfer Media

**Option A: USB Drive**
- [ ] USB drive inserted (minimum 4GB capacity)
- [ ] USB drive mounted
- [ ] Copy: `cp nms-offline-package-*.tar.gz /media/$USER/<usb-drive>/`
- [ ] Optional: `cp docker-offline-install.tar.gz /media/$USER/<usb-drive>/`
- [ ] Safely eject: `sync && sudo umount /media/$USER/<usb-drive>/`

**Option B: Network Transfer (if available)**
- [ ] SCP: `scp nms-offline-package-*.tar.gz user@offline-vm:/tmp/`
- [ ] Transfer completed successfully

**Option C: Shared Folder (VM)**
- [ ] Shared folder configured
- [ ] Package copied to shared folder

### ☐ Verify Transfer
- [ ] Package exists on offline machine
- [ ] File size matches original
- [ ] Optional: Verify checksum

---

## Phase 3: On Offline Ubuntu VM (Installation)

### ☐ Initial Setup
- [ ] Ubuntu 20.04 or 22.04 LTS installed
- [ ] User has sudo privileges
- [ ] At least 50GB free disk space: `df -h`
- [ ] At least 8GB RAM: `free -h`

### ☐ Install Docker (if not installed)

**Check if Docker is installed:**
```bash
docker --version
```

**If not installed, use offline installer:**
```bash
tar -xzf docker-offline-install.tar.gz
cd docker-offline-install
./install-docker-offline.sh
newgrp docker
cd ..
```

- [ ] Docker installed
- [ ] Docker service running: `systemctl status docker`
- [ ] Can run docker without sudo: `docker ps`
- [ ] Docker Compose available: `docker compose version`

### ☐ Extract Offline Package
```bash
cd /opt  # or wherever you want to install
tar -xzf /tmp/nms-offline-package-*.tar.gz
cd nms-offline-package-*/
ls -la
```

- [ ] Package extracted
- [ ] Can see directory contents
- [ ] INSTALLATION.txt file exists

### ☐ Load Docker Images
```bash
docker load -i postgres-16-alpine.tar
docker load -i nginx-1.27-alpine.tar
docker load -i node-20-alpine.tar
docker load -i nms-api.tar
docker load -i nms-frontend.tar
```

- [ ] PostgreSQL image loaded
- [ ] Nginx image loaded
- [ ] Node image loaded
- [ ] API image loaded
- [ ] Frontend image loaded
- [ ] Verify: `docker images` shows all 5 images

### ☐ Install System Dependencies (Optional)
```bash
cd system-packages-debian
sudo dpkg -i *.deb
sudo apt-get install -f  # Fix dependencies
cd ..
```

- [ ] System packages installed
- [ ] No dependency errors

### ☐ Configure Application
```bash
cd nms-ritvik
cp server/.env.example server/.env
nano server/.env  # or vi
```

**Edit these critical settings:**

- [ ] `JWT_SECRET` changed from default (64+ characters)
- [ ] `ADMIN_PASSWORD` changed from default (strong password)
- [ ] `DATABASE_URL` configured
- [ ] `SNMP_COMMUNITY` set for your network
- [ ] `CORS_ORIGIN` set if needed

**Example secure values:**
```bash
JWT_SECRET=7f9a2e4b6c1d8e5f3a4b9c7e8d6f5a4b3c2e1d9f8e7c6d5b4a3f2e1c9d8b7a6f5e4d3
ADMIN_PASSWORD=MySecureP@ssw0rd2024!
```

### ☐ Start Services
```bash
docker compose up -d
```

- [ ] Command completed without errors
- [ ] All containers starting

### ☐ Wait for Initialization
```bash
# Watch logs (wait 30-60 seconds)
docker compose logs -f
# Press Ctrl+C to exit
```

**Look for these messages:**
- [ ] "Migrations completed successfully"
- [ ] "NMS API listening on :4000"
- [ ] "Monitoring scheduler started"

### ☐ Verify Deployment
```bash
# Run verification script
chmod +x ../verify-ubuntu-deployment.sh
../verify-ubuntu-deployment.sh
```

**OR manually check:**

```bash
# 1. Check containers
docker compose ps
```
- [ ] `nms-postgres` is Up (healthy)
- [ ] `nms-api` is Up (healthy)
- [ ] `nms-frontend` is Up
- [ ] `nms-nginx` is Up

```bash
# 2. Check API health
curl http://localhost/api/health
```
- [ ] Returns: `{"status":"healthy",...}`

```bash
# 3. Check database
docker compose exec postgres psql -U nms -d nms -c "\dt"
```
- [ ] Shows 17 tables

```bash
# 4. Check frontend
curl -I http://localhost/
```
- [ ] Returns: `HTTP/1.1 200 OK`

```bash
# 5. Check monitoring
docker compose logs api | grep "Monitoring cycle"
```
- [ ] Shows monitoring logs

### ☐ Access Application

**From VM itself:**
```bash
firefox http://localhost &
```

**From another machine:**
```bash
# Get VM IP
ip addr show | grep "inet " | grep -v 127.0.0.1
# Access: http://<vm-ip>
```

- [ ] Dashboard loads
- [ ] Shows 5 network cards
- [ ] Can log in with admin credentials
- [ ] Simulation shows 56 devices

---

## Phase 4: Configuration & Testing

### ☐ Initial Configuration
- [ ] Logged in as admin
- [ ] Changed admin password (if using default)
- [ ] Created additional users (if needed)
- [ ] Reviewed settings page
- [ ] Configured alert thresholds

### ☐ Network Configuration
- [ ] Updated SNMP community string for your network
- [ ] Verified ICMP (ping) works from container:
  ```bash
  docker compose exec api ping -c 4 <your-device-ip>
  ```
- [ ] Tested SNMP from container:
  ```bash
  docker compose exec api snmpget -v2c -c public <device-ip> sysDescr.0
  ```

### ☐ Device Upload
- [ ] Prepared CSV/XLSX file with device inventory
- [ ] Uploaded via Upload page
- [ ] Verified devices appear in dashboard
- [ ] Checked device details

### ☐ Monitoring Verification
- [ ] Wait 30 seconds for first monitoring cycle
- [ ] Check devices show live status
- [ ] Verify metrics are being collected
- [ ] Check alerts are being generated

### ☐ Features Testing
- [ ] Dashboard displays correctly
- [ ] Network detail pages work
- [ ] Device table shows data
- [ ] Charts render properly
- [ ] Alerts page shows active alerts
- [ ] Reports can be exported (PDF, XLSX, CSV)
- [ ] Settings can be updated
- [ ] Users can be managed
- [ ] Audit logs are recorded

---

## Phase 5: Production Hardening

### ☐ Security Hardening
- [ ] Strong admin password set
- [ ] JWT secret is random (64+ chars)
- [ ] HTTPS configured (if required)
- [ ] Firewall rules configured:
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp  # if using HTTPS
  sudo ufw enable
  ```
- [ ] Changed default PostgreSQL password in docker-compose.yml
- [ ] Reviewed and restricted user permissions

### ☐ Backup Configuration
- [ ] Database backup script created:
  ```bash
  docker compose exec postgres pg_dump -U nms nms > backup-$(date +%Y%m%d).sql
  ```
- [ ] Backup schedule configured (cron job)
- [ ] Backup retention policy defined
- [ ] Tested restore procedure

### ☐ Monitoring & Alerts
- [ ] Configured email/SMS notifications (if available)
- [ ] Set appropriate alert thresholds
- [ ] Tested alert notification delivery
- [ ] Configured alert acknowledgment workflow

### ☐ Performance Tuning
- [ ] Reviewed database performance
- [ ] Adjusted PostgreSQL settings if needed
- [ ] Configured log rotation
- [ ] Set up metrics retention policy

### ☐ Documentation
- [ ] Documented custom configurations
- [ ] Created runbook for common tasks
- [ ] Documented backup/restore procedures
- [ ] Created troubleshooting guide

---

## Phase 6: Ongoing Operations

### ☐ Daily Checks
- [ ] Check container health: `docker compose ps`
- [ ] Review error logs: `docker compose logs --tail=100`
- [ ] Monitor disk space: `df -h`
- [ ] Check database size:
  ```bash
  docker compose exec postgres psql -U nms -d nms -c "SELECT pg_size_pretty(pg_database_size('nms'));"
  ```

### ☐ Weekly Maintenance
- [ ] Review alert history
- [ ] Check database growth trends
- [ ] Verify backups are running
- [ ] Test backup restore (once a month)
- [ ] Review audit logs
- [ ] Update device inventory if needed

### ☐ Monthly Tasks
- [ ] Review system performance
- [ ] Check for degraded devices
- [ ] Analyze metric trends
- [ ] Review and update alert thresholds
- [ ] Clean up old audit logs if needed

---

## Troubleshooting Checklist

### ☐ If Containers Won't Start
- [ ] Check logs: `docker compose logs`
- [ ] Check disk space: `df -h`
- [ ] Check port conflicts: `sudo lsof -i :80`
- [ ] Restart Docker: `sudo systemctl restart docker`
- [ ] Rebuild: `docker compose up -d --force-recreate`

### ☐ If API Not Responding
- [ ] Check API container: `docker compose logs api`
- [ ] Check database connection:
  ```bash
  docker compose exec api env | grep DATABASE_URL
  ```
- [ ] Verify .env file: `cat server/.env`
- [ ] Restart API: `docker compose restart api`

### ☐ If Monitoring Not Working
- [ ] Check scheduler logs:
  ```bash
  docker compose logs api | grep -i "scheduler\|monitoring"
  ```
- [ ] Verify NET_RAW capability:
  ```bash
  docker compose exec api capsh --print | grep cap_net_raw
  ```
- [ ] Test ping manually:
  ```bash
  docker compose exec api ping -c 4 8.8.8.8
  ```
- [ ] Check SNMP manually:
  ```bash
  docker compose exec api snmpget -v2c -c public <device-ip> sysDescr.0
  ```

### ☐ If Frontend Not Loading
- [ ] Check nginx logs: `docker compose logs nginx`
- [ ] Check frontend logs: `docker compose logs frontend`
- [ ] Test API directly: `curl http://localhost/api/health`
- [ ] Check browser console (F12) for errors
- [ ] Clear browser cache

---

## Success Criteria

### ✅ Deployment is successful when:

- [x] All Docker containers are running healthy
- [x] API health endpoint returns 200 OK
- [x] Database has 17 tables with seed data
- [x] Frontend loads and shows dashboard
- [x] Can log in as admin
- [x] Monitoring cycle runs every 30 seconds
- [x] Devices can be uploaded
- [x] Alerts are generated based on thresholds
- [x] Reports can be exported
- [x] No errors in logs
- [x] Verification script passes all checks

---

## Quick Commands Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart specific service
docker compose restart api

# Check container status
docker compose ps

# Execute command in container
docker compose exec api bash

# Database backup
docker compose exec postgres pg_dump -U nms nms > backup.sql

# Database restore
cat backup.sql | docker compose exec -T postgres psql -U nms -d nms

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a

# View resource usage
docker stats
```

---

## Support Resources

- **Documentation**: See `*.md` files in project root
- **Logs**: `docker compose logs`
- **Verification**: `./verify-ubuntu-deployment.sh`
- **Troubleshooting**: See `UBUNTU_OFFLINE_SETUP.md`

---

## 🎉 Congratulations!

If you've completed all checks, your NMS is fully deployed and operational!

**Next steps:**
1. Start uploading your real device inventory
2. Configure monitoring for your actual network
3. Set up alert notifications
4. Train your team on using the system

**Enjoy your offline Network Monitoring System!** 🚀
