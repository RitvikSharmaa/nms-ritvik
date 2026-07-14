# ☑️ Ubuntu VM Setup Checklist

## Pre-Transfer (On Windows Machine)

- [ ] Project folder `nms-ritvik` is complete
- [ ] All files are present (check with `ls -la`)
- [ ] Git repository is up to date
- [ ] No uncommitted changes

---

## Ubuntu VM Preparation (While Connected)

### Docker Installation
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose installed (`docker compose version`)
- [ ] User added to docker group (`sudo usermod -aG docker $USER`)
- [ ] Logged out and back in (docker group active)
- [ ] Can run `docker ps` without sudo

### System Dependencies
- [ ] Build tools installed (`sudo apt install build-essential`)
- [ ] Python installed (`python3 --version`)
- [ ] Network tools installed (`sudo apt install iputils-ping net-tools`)

### Docker Images (Choose Option A OR B)

**Option A: Pull Images (while connected)**
- [ ] `docker pull postgres:16-alpine`
- [ ] `docker pull node:20-alpine`
- [ ] `docker pull nginx:alpine`
- [ ] Verify: `docker images` shows all 3 images

**Option B: Load from Tarballs (after going offline)**
- [ ] Transfer tar files to VM
- [ ] `docker load -i postgres-16-alpine.tar`
- [ ] `docker load -i node:20-alpine.tar`
- [ ] `docker load -i nginx-alpine.tar`
- [ ] Verify: `docker images` shows all 3 images

---

## File Transfer to Ubuntu VM

### Choose Transfer Method

**Method 1: Shared Folder (VMware/VirtualBox)**
- [ ] Shared folder configured in VM settings
- [ ] Folder accessible in VM (`/mnt/hgfs/` or `/media/sf_/`)
- [ ] Copied to home directory: `cp -r /mnt/hgfs/nms-ritvik ~/`

**Method 2: USB Drive**
- [ ] Files copied to USB on Windows
- [ ] USB mounted in Ubuntu VM
- [ ] Copied to home directory: `cp -r /media/usb/nms-ritvik ~/`

**Method 3: SCP (while connected)**
- [ ] SSH enabled on Windows or Ubuntu VM
- [ ] Copied via SCP: `scp -r user@ip:/path/to/nms-ritvik ~/`

**Method 4: Zip File**
- [ ] Zipped on Windows: `nms-ritvik.zip`
- [ ] Transferred to Ubuntu VM
- [ ] Extracted: `unzip nms-ritvik.zip`

### Verify Transfer
- [ ] Navigate to project: `cd ~/nms-ritvik`
- [ ] Check files exist: `ls -la`
- [ ] Key files present:
  - [ ] `docker-compose.yml`
  - [ ] `server/` directory
  - [ ] `src/` directory
  - [ ] `Dockerfile.frontend`
  - [ ] `setup-ubuntu.sh`
  - [ ] `server/.env.example`

---

## Configuration (Offline)

### Environment Setup
- [ ] Navigate to project: `cd ~/nms-ritvik`
- [ ] Copy env file: `cp server/.env.example server/.env`
- [ ] Edit env file: `nano server/.env`

### Required Environment Variables
- [ ] `JWT_SECRET` - Changed to strong random string
- [ ] `ADMIN_PASSWORD` - Changed to strong password
- [ ] `DATABASE_URL` - Verified (default OK for Docker)
- [ ] `ADMIN_USERNAME` - Set (default `admin` OK)
- [ ] `ADMIN_EMAIL` - Set (default `admin@localhost` OK)
- [ ] `POLL_INTERVAL_SECONDS` - Set (default `30` OK)
- [ ] `SNMP_COMMUNITY` - Set (default `public` OK)
- [ ] Saved changes (Ctrl+O, Enter, Ctrl+X)

---

## Build & Deploy (Offline)

### Option A: Using Setup Script (Recommended)
- [ ] Make script executable: `chmod +x setup-ubuntu.sh`
- [ ] Run setup script: `./setup-ubuntu.sh`
- [ ] Script completed successfully
- [ ] No error messages displayed

### Option B: Manual Setup
- [ ] Build images: `docker compose build`
- [ ] Build completed without errors
- [ ] Start services: `docker compose up -d`
- [ ] All containers started

---

## Verification

### Check Services Running
- [ ] Run: `docker compose ps`
- [ ] `nms-postgres` - Status: `Up`
- [ ] `nms-api` - Status: `Up`
- [ ] `nms-frontend` - Status: `Up`
- [ ] `nms-nginx` - Status: `Up`
- [ ] All ports mapped correctly

### Check Logs (No Errors)
- [ ] View logs: `docker compose logs`
- [ ] No critical errors in logs
- [ ] API shows: `Server running on port 4000`
- [ ] Database shows: `database system is ready to accept connections`
- [ ] Migrations applied successfully

### API Health Check
- [ ] Test API: `curl http://localhost:4000/api/health`
- [ ] Response: `{"status":"ok",...}`
- [ ] No connection errors

### Frontend Access
- [ ] Test frontend: `curl http://localhost`
- [ ] Returns HTML content
- [ ] No 502/503 errors

---

## First Access

### Login
- [ ] Open browser: http://localhost
- [ ] Login page loads without errors
- [ ] No console errors in browser DevTools (F12)
- [ ] Login with admin credentials
- [ ] Successfully logged in
- [ ] Dashboard page loads

### Initial Configuration
- [ ] Dashboard displays correctly
- [ ] KPI cards show zeros (normal, no devices yet)
- [ ] Charts show empty (normal, no data yet)
- [ ] Navigation menu works
- [ ] Can access all pages:
  - [ ] Dashboard
  - [ ] Network-1 through Network-5
  - [ ] Devices
  - [ ] Alerts
  - [ ] Reports
  - [ ] Comparison
  - [ ] Settings
  - [ ] Users
  - [ ] Audit Logs

---

## Device Upload

### Prepare Test CSV
- [ ] Create `test-devices.csv` file:
```csv
Username,IP Address,Device Name,Link,Network
admin,8.8.8.8,Google-DNS,Link-1,Network-1
admin,1.1.1.1,Cloudflare-DNS,Link-1,Network-1
admin,192.168.1.1,Local-Router,Link-2,Network-2
```

### Upload Devices
- [ ] Go to Devices page
- [ ] Click "Import CSV" button
- [ ] Select `test-devices.csv`
- [ ] Preview shows devices correctly
- [ ] Click "Confirm Import"
- [ ] Success message displayed
- [ ] Devices appear in table

---

## Monitoring Verification

### Wait for First Poll (30 seconds)
- [ ] Wait 30 seconds
- [ ] Check API logs: `docker compose logs -f api | grep "Monitoring cycle"`
- [ ] See: `[INFO] Monitoring cycle started for X devices`
- [ ] Monitoring cycle completes without errors

### Dashboard Data
- [ ] Go to Dashboard page
- [ ] Refresh browser (F5)
- [ ] KPI cards show non-zero values:
  - [ ] Total Devices: 3 (or your number)
  - [ ] Online: >0
  - [ ] Avg Latency: Shows value (1-50ms)
- [ ] Charts show data:
  - [ ] Latency Trend: Shows line
  - [ ] Bandwidth Trend: Shows data
  - [ ] Packet Loss Trend: Shows data
- [ ] Wait another 30 seconds
- [ ] Charts update with new data point

### Network Pages
- [ ] Go to Network-1 page
- [ ] Shows devices in Network-1
- [ ] Charts show data for Network-1 only
- [ ] Repeat for other networks

---

## Alerts Verification

### Check Alerts Page
- [ ] Go to Alerts page
- [ ] If devices are reachable: Should see "No active alerts" (good!)
- [ ] If devices are unreachable: Should see "Device Down" alerts

### Test Alert Generation (Optional)
- [ ] Add a fake/unreachable device
- [ ] Wait 30 seconds
- [ ] Check Alerts page
- [ ] Should see "Device Down" alert
- [ ] Acknowledge or resolve alert
- [ ] Status changes correctly

---

## Reports Verification

### Generate Test Report
- [ ] Go to Reports page
- [ ] Select date range (last 7 days)
- [ ] Select network (Network-1 or "All")
- [ ] Click "Export PDF"
- [ ] PDF downloads successfully
- [ ] PDF opens and shows data
- [ ] Try CSV export
- [ ] Try XLSX export

---

## User Management

### Add Test User
- [ ] Go to Users page
- [ ] Click "Add User"
- [ ] Fill in details:
  - [ ] Username: `testuser`
  - [ ] Full Name: `Test User`
  - [ ] Email: `test@localhost`
  - [ ] Role: `Viewer`
  - [ ] Password: `TestPass123!`
- [ ] Save user
- [ ] User appears in table
- [ ] Logout and login as `testuser`
- [ ] Verify viewer can only view (no edit/delete)
- [ ] Logout and login back as `admin`

---

## Settings Configuration

### Update Settings
- [ ] Go to Settings page
- [ ] View current settings
- [ ] Change polling interval (e.g., to 60 seconds)
- [ ] Save changes
- [ ] Success message displayed
- [ ] Check API logs: monitoring now runs every 60 seconds
- [ ] Change back to 30 seconds if desired

---

## Performance Check

### Resource Usage
- [ ] Run: `docker stats`
- [ ] CPU usage reasonable (<50% avg)
- [ ] Memory usage reasonable (<2GB total)
- [ ] No container restarting

### Disk Usage
- [ ] Run: `docker system df`
- [ ] Check available space: `df -h`
- [ ] Enough space for database growth

---

## Backup Test

### Create Backup
- [ ] Backup database:
  ```bash
  docker compose exec postgres pg_dump -U nms nms > backup.sql
  ```
- [ ] Backup file created successfully
- [ ] File has content: `ls -lh backup.sql`

---

## Final Verification

### Stability Test
- [ ] Application running for 5+ minutes
- [ ] No container crashes: `docker compose ps`
- [ ] No critical errors in logs
- [ ] Monitoring continues every 30 seconds
- [ ] Dashboard updates automatically

### Restart Test
- [ ] Stop application: `docker compose down`
- [ ] Start again: `docker compose up -d`
- [ ] All services start successfully
- [ ] Data persisted (devices still there)
- [ ] Monitoring resumes automatically

---

## Troubleshooting (If Issues)

### Common Issues Fixed
- [ ] If permission denied: Added user to docker group, logged out/in
- [ ] If port conflict: Changed port or stopped conflicting service
- [ ] If database connection fails: Restarted postgres, waited 10s, restarted api
- [ ] If images missing: Loaded from tar files or pulled again
- [ ] If build fails: Cleaned up with `docker system prune`, rebuilt

---

## Documentation Check

### Verify Documentation Files Present
- [ ] `README_UBUNTU_VM.md` - Quick setup guide
- [ ] `UBUNTU_VM_SETUP.md` - Complete setup guide
- [ ] `UBUNTU_VM_CHECKLIST.md` - This checklist
- [ ] `OFFLINE_DEPLOYMENT_GUIDE.md` - Detailed deployment
- [ ] `QUICK_START.md` - Quick start
- [ ] `TESTING_GUIDE.md` - Testing procedures
- [ ] `PROJECT_COMPLETION_STATUS.md` - Feature status

---

## Sign-Off

### Final Checks
- [ ] All above checks completed ✅
- [ ] Application accessible at http://localhost
- [ ] Monitoring working (devices being polled every 30s)
- [ ] Charts displaying real data
- [ ] All features tested and working
- [ ] No critical errors in logs
- [ ] Ready for production use

### Completion
- [ ] Date completed: _______________
- [ ] Tested by: _______________
- [ ] Deployment successful: ✅

---

## Quick Command Reference

```bash
# Status
docker compose ps

# Logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Start
docker compose up -d

# Access database
docker compose exec postgres psql -U nms nms

# Backup
docker compose exec postgres pg_dump -U nms nms > backup.sql

# Monitor resources
docker stats
```

---

## 🎉 Congratulations!

If you've completed all checks above, your NetPulse NMS is fully operational on Ubuntu VM in offline/air-gapped mode!

**You can now:**
- ✅ Monitor network devices in real-time
- ✅ View live charts and metrics
- ✅ Manage devices and users
- ✅ Generate reports
- ✅ Handle alerts
- ✅ All completely offline!

**Next steps:**
1. Import your production device list
2. Configure SNMP community strings if needed
3. Set up monitoring thresholds
4. Create additional user accounts
5. Schedule regular database backups

**Need help?** Check the documentation files listed above! 🚀
