# 🚀 What To Do After Unzipping on Ubuntu VM

## You Just Unzipped the Folder. Now What?

Follow these simple steps to get the application running!

---

## ⚠️ IMPORTANT: Before You Start

**Make sure you did this ONE TIME while your VM was connected to internet:**

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Add yourself to docker group
sudo usermod -aG docker $USER

# 3. Logout and login again

# 4. Install Docker Compose
sudo apt install docker-compose-plugin

# 5. Pull these 3 Docker images (VERY IMPORTANT!)
docker pull postgres:16-alpine
docker pull node:20-alpine  
docker pull nginx:alpine

# 6. Verify images are downloaded
docker images
# Should show all 3 images above

# NOW you can disconnect from internet and continue below!
```

**If you haven't done this, do it NOW before continuing!**

---

## Step-by-Step Guide (After Unzip)

### Step 1: Navigate to Project Folder

```bash
cd ~/nms-ritvik
```

**Verify you're in the right place:**
```bash
ls -la
```

You should see:
- `setup-ubuntu.sh`
- `docker-compose.yml`
- `server/` folder
- `src/` folder
- Many `.md` files

---

### Step 2: Create Configuration File

```bash
# Copy the example file to create your config
cp server/.env.example server/.env
```

---

### Step 3: Edit Configuration (IMPORTANT!)

```bash
# Open the config file
nano server/.env
```

**You'll see a file with many settings. You MUST change these two lines:**

Find these lines:
```bash
JWT_SECRET=change-this-to-a-long-random-string
ADMIN_PASSWORD=change-this-password
```

**Change them to:**
```bash
JWT_SECRET=my-super-secret-random-string-for-jwt-min-32-characters
ADMIN_PASSWORD=MyStrongPassword123!
```

**Important Tips:**
- `JWT_SECRET`: Use any random string, minimum 32 characters
- `ADMIN_PASSWORD`: This will be your admin login password - remember it!

**Save the file:**
- Press `Ctrl+O` (save)
- Press `Enter` (confirm)
- Press `Ctrl+X` (exit)

---

### Step 4: Make Setup Script Executable

```bash
chmod +x setup-ubuntu.sh
```

---

### Step 5: Run Setup Script

```bash
./setup-ubuntu.sh
```

**What happens now:**
1. Script checks if Docker is installed ✅
2. Script checks if Docker images are available ✅
3. Script builds the application (takes 3-5 minutes) ⏱️
4. Script starts all services 🚀
5. Script waits for everything to be ready ⏳
6. Script shows success message! 🎉

**This will take 5-8 minutes. Be patient!**

**Expected output at the end:**
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

Useful commands:
  View logs:        docker compose logs -f
  Stop services:    docker compose down
  Restart services: docker compose restart
  View status:      docker compose ps
```

---

### Step 6: Access the Application

**Open your web browser and go to:**
```
http://localhost
```

You should see a login page!

**Login with:**
- **Username**: `admin`
- **Password**: (the password you set in Step 3)

---

### Step 7: Upload Your Devices

1. After login, you'll see the Dashboard
2. Click on **"Devices"** in the left menu
3. Click the **"Import CSV"** button
4. Select your device CSV file (or create a test one - see below)
5. Review the preview
6. Click **"Confirm Import"**
7. Your devices are now imported!

---

### Step 8: Wait for Monitoring to Start

**Wait 30 seconds!**

The monitoring engine runs every 30 seconds. After 30 seconds:

1. Go to **Dashboard** page
2. You'll see charts start showing data!
3. Latency, packet loss, bandwidth - all displayed
4. Charts will update automatically every 30 seconds

**🎉 You're done! Your Network Monitoring System is running!**

---

## Creating a Test Device CSV

If you don't have a device CSV yet, create one for testing:

```bash
nano test-devices.csv
```

**Paste this content:**
```csv
Username,IP Address,Device Name,Link,Network
admin,8.8.8.8,Google-DNS,Link-1,Network-1
admin,1.1.1.1,Cloudflare-DNS,Link-1,Network-1
admin,192.168.1.1,Local-Router,Link-2,Network-2
admin,192.168.1.10,Local-Switch,Link-2,Network-2
admin,10.0.0.1,Corporate-Gateway,Link-3,Network-3
```

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

Now upload this file in Step 7!

---

## Verification Checklist

After setup, verify everything is working:

### Check 1: Services are Running

```bash
docker compose ps
```

**Expected output:**
```
NAME            STATUS          PORTS
nms-api         Up              0.0.0.0:4000->4000/tcp
nms-frontend    Up              
nms-nginx       Up              0.0.0.0:80->80/tcp
nms-postgres    Up              0.0.0.0:5432->5432/tcp
```

All should show "Up" status.

### Check 2: Can Access Login Page

Open browser: `http://localhost`

Should show login page (not error page).

### Check 3: Can Login

Login with `admin` and your password.

Should take you to Dashboard.

### Check 4: Monitoring is Running

```bash
docker compose logs -f api | grep "Monitoring cycle"
```

**Expected output (every 30 seconds):**
```
[INFO] Monitoring cycle started for X devices
```

Press `Ctrl+C` to stop viewing logs.

### Check 5: Dashboard Shows Data

After uploading devices and waiting 30 seconds:
- Dashboard should show device counts
- Charts should show lines (not empty)
- KPI cards should show numbers

**✅ If all checks pass, everything is working perfectly!**

---

## Troubleshooting

### Problem: "Permission denied" when running docker

**Solution:**
```bash
sudo usermod -aG docker $USER
# Then logout and login again
newgrp docker
```

### Problem: "docker: command not found"

**Solution:**
Docker is not installed. Install it:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Problem: "No such image: postgres:16-alpine"

**Solution:**
You forgot to pull Docker images. You need internet for this:
```bash
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull nginx:alpine
```

### Problem: "Port 80 already in use"

**Solution:**
Another service is using port 80:
```bash
# Stop conflicting services
sudo systemctl stop apache2
sudo systemctl stop nginx

# Or change port in docker-compose.yml
nano docker-compose.yml
# Change line: "80:80" to "8080:80"
# Then access at http://localhost:8080
```

### Problem: Setup script fails during build

**Solution:**
Check if you have enough disk space:
```bash
df -h
# Need at least 10GB free

# If low on space, clean Docker:
docker system prune -a
```

### Problem: Can't connect to database

**Solution:**
Restart everything:
```bash
docker compose down
docker compose up -d
```

### Problem: Charts not showing data

**Solution:**
1. Make sure you uploaded devices (Step 7)
2. Wait at least 30 seconds
3. Refresh the browser page (F5)
4. Check monitoring is running:
   ```bash
   docker compose logs api | grep "Monitoring cycle"
   ```

---

## Daily Usage Commands

### Start the Application

```bash
cd ~/nms-ritvik
docker compose up -d
```

### Stop the Application

```bash
cd ~/nms-ritvik
docker compose down
```

### View Logs (Troubleshooting)

```bash
# All logs
docker compose logs -f

# Just API logs
docker compose logs -f api

# Just database logs
docker compose logs -f postgres

# Press Ctrl+C to stop viewing logs
```

### Restart Services

```bash
docker compose restart
```

### Check Status

```bash
docker compose ps
```

### Backup Database

```bash
docker compose exec postgres pg_dump -U nms nms > backup-$(date +%Y%m%d).sql
```

---

## Complete Command Reference

```bash
# Navigate to project
cd ~/nms-ritvik

# View what's running
docker compose ps

# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart all services
docker compose restart

# Restart one service
docker compose restart api

# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f api
docker compose logs -f postgres
docker compose logs -f frontend
docker compose logs -f nginx

# Check disk usage
docker system df

# Clean up old containers/images
docker system prune -a

# Connect to database
docker compose exec postgres psql -U nms nms

# Backup database
docker compose exec postgres pg_dump -U nms nms > backup.sql

# Check monitoring is running
docker compose logs api | grep "Monitoring cycle"
```

---

## Quick Summary

**After unzipping, run these 5 commands:**

```bash
cd ~/nms-ritvik
cp server/.env.example server/.env
nano server/.env          # Edit JWT_SECRET and ADMIN_PASSWORD
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

**Then:**
1. Open browser: `http://localhost`
2. Login: `admin` / (your password)
3. Upload devices CSV
4. Wait 30 seconds
5. See monitoring data! 🎉

---

## What's Next?

After the application is running:

1. **Explore the Dashboard**
   - View real-time metrics
   - See charts update every 30 seconds
   - Check device status

2. **Add More Devices**
   - Go to Devices page
   - Import more CSV files
   - Or add devices manually

3. **Check Network Pages**
   - Network-1 through Network-5
   - Each shows filtered data

4. **Generate Reports**
   - Go to Reports page
   - Export PDF, CSV, or XLSX
   - Download and view

5. **Manage Users**
   - Go to Users page
   - Create additional users
   - Assign roles (Admin/Operator/Viewer)

6. **Configure Settings**
   - Go to Settings page
   - Adjust polling interval
   - Change thresholds

---

## Need More Help?

Check these files in the project folder:

- `START_HERE_UBUNTU_VM.md` - Quick start guide
- `ZIP_AND_TRANSFER_GUIDE.md` - How to zip and transfer
- `UBUNTU_VM_SETUP.md` - Detailed setup guide
- `UBUNTU_VM_CHECKLIST.md` - Verification checklist
- `README_UBUNTU_VM.md` - Quick reference

---

## Success Criteria

✅ You're successful when:

1. `docker compose ps` shows all 4 services "Up"
2. `http://localhost` opens the application
3. You can login with admin credentials
4. Dashboard displays without errors
5. You can upload device CSV
6. After 30 seconds, charts show data
7. Charts update automatically every 30 seconds

**If all above work, congratulations! 🎉**

---

## Final Checklist

- [ ] Unzipped the folder
- [ ] Navigated to project: `cd ~/nms-ritvik`
- [ ] Created config: `cp server/.env.example server/.env`
- [ ] Edited config: Changed `JWT_SECRET` and `ADMIN_PASSWORD`
- [ ] Made script executable: `chmod +x setup-ubuntu.sh`
- [ ] Ran setup: `./setup-ubuntu.sh`
- [ ] Opened browser: `http://localhost`
- [ ] Logged in as admin
- [ ] Uploaded devices CSV
- [ ] Waited 30 seconds
- [ ] Dashboard shows monitoring data
- [ ] ✅ SUCCESS!

---

## 🎉 You Did It!

Your **NetPulse NMS** is now running on your Ubuntu VM, completely offline!

**You now have:**
- ✅ Real-time network monitoring
- ✅ ICMP ping and SNMP polling
- ✅ Live dashboard with charts
- ✅ Device management
- ✅ Alert system
- ✅ Report generation
- ✅ User management
- ✅ Complete web interface

**All running completely offline on your air-gapped Ubuntu VM!** 🚀

---

**For questions, check the documentation files or run:**
```bash
ls *.md  # Lists all documentation files
```

**Good luck with your hackathon! 🎯**
