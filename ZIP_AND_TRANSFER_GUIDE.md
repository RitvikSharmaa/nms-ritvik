# 📦 Zip and Transfer Guide - Windows to Ubuntu VM

## Exactly What You Asked For: Zip → Transfer → Unzip → Run!

---

## Step 1: Create Zip on Windows

### Option A: Using Windows Explorer (Easy)

1. Navigate to the parent folder containing `nms-ritvik`
2. Right-click on the `nms-ritvik` folder
3. Select **Send to → Compressed (zipped) folder**
4. You'll get `nms-ritvik.zip`

### Option B: Using 7-Zip or WinRAR

1. Right-click on `nms-ritvik` folder
2. Select **7-Zip → Add to nms-ritvik.zip** (or similar)
3. Done!

### Option C: Using PowerShell

```powershell
# In PowerShell
cd "c:\seperate folder\temp\hackathon\NMS"
Compress-Archive -Path nms-ritvik -DestinationPath nms-ritvik.zip
```

**Result**: You should have `nms-ritvik.zip` (around 200-300 MB compressed)

---

## Step 2: Transfer to Ubuntu VM

Choose the method that works for your VM setup:

### Method 1: Shared Folder (VMware/VirtualBox) - EASIEST

#### For VirtualBox:
1. **On VirtualBox**: VM Settings → Shared Folders → Add folder
2. Select your Windows folder (e.g., `C:\Transfer`)
3. Check "Auto-mount" and "Make Permanent"
4. Start VM

**On Ubuntu VM:**
```bash
# Shared folder will be at /media/sf_Transfer (or /media/sf_<foldername>)
cp /media/sf_Transfer/nms-ritvik.zip ~/
```

#### For VMware:
1. **On VMware**: VM → Settings → Options → Shared Folders
2. Add folder path
3. Enable "Always enabled"

**On Ubuntu VM:**
```bash
# Shared folder will be at /mnt/hgfs/<foldername>
cp /mnt/hgfs/Transfer/nms-ritvik.zip ~/
```

---

### Method 2: USB Drive - SIMPLE

1. **On Windows**: Copy `nms-ritvik.zip` to USB drive
2. Plug USB into Ubuntu VM (or pass it through in VM settings)
3. **On Ubuntu VM**:

```bash
# List USB devices
lsblk

# USB will be at /media/<username>/<device_name> or /media/usb
# Copy from USB
cp /media/<username>/*/nms-ritvik.zip ~/

# Or if auto-mounted:
cp /media/usb/nms-ritvik.zip ~/
```

---

### Method 3: Drag and Drop (VMware Workstation Pro/Fusion)

1. Enable drag-and-drop in VM settings
2. Simply **drag `nms-ritvik.zip`** from Windows into Ubuntu VM desktop
3. Move to home directory:

```bash
mv ~/Desktop/nms-ritvik.zip ~/
```

---

### Method 4: Network Transfer (SCP) - If VM has network temporarily

**On Ubuntu VM** (get IP address):
```bash
ip addr show
# Note the IP address (e.g., 192.168.1.100)

# Make sure SSH is running
sudo systemctl start ssh
```

**On Windows** (using PowerShell or command prompt):
```powershell
# Using SCP (if you have it installed)
scp "c:\seperate folder\temp\hackathon\NMS\nms-ritvik.zip" user@192.168.1.100:~/

# Or use WinSCP GUI application (free download)
```

---

## Step 3: Unzip on Ubuntu VM

```bash
# Go to home directory
cd ~

# Check file is there
ls -lh nms-ritvik.zip

# Unzip
unzip nms-ritvik.zip

# OR if you get "unzip not installed"
sudo apt update
sudo apt install unzip
unzip nms-ritvik.zip

# You should now have nms-ritvik folder
ls -la nms-ritvik/
```

**Expected output:**
```
drwxr-xr-x  8 user user 4096 Jul 14 12:00 nms-ritvik
```

---

## Step 4: Setup on Ubuntu VM (Offline)

### Prerequisites Check (One-Time, While Connected)

**Before going offline, make sure you have:**

```bash
# 1. Check Docker installed
docker --version
# If not: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh

# 2. Check Docker Compose installed
docker compose version
# If not: sudo apt install docker-compose-plugin

# 3. Check you can run docker without sudo
docker ps
# If error: sudo usermod -aG docker $USER, then logout and login

# 4. Pull Docker images (VERY IMPORTANT - do this while connected!)
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull nginx:alpine

# Verify images
docker images
# Should show all 3 images

# NOW you can disconnect and go offline!
```

---

### Run Setup (Offline)

```bash
# Navigate to project
cd ~/nms-ritvik

# Make setup script executable
chmod +x setup-ubuntu.sh

# Configure environment (IMPORTANT!)
cp server/.env.example server/.env
nano server/.env

# Change these two lines:
# JWT_SECRET=your-random-secret-string-min-32-characters-long
# ADMIN_PASSWORD=YourStrongPassword123!

# Save: Ctrl+O, Enter, Ctrl+X

# Run setup script
./setup-ubuntu.sh
```

**What the script does:**
1. ✅ Checks Docker installation
2. ✅ Checks permissions
3. ✅ Verifies Docker images
4. ✅ Builds application images (3-5 min)
5. ✅ Starts all services
6. ✅ Waits for health checks
7. ✅ Shows success message

**Expected time: 5-8 minutes**

---

## Step 5: Access Application

**Open browser and go to:**
```
http://localhost
```

**Login with:**
- Username: `admin`
- Password: (whatever you set in `server/.env` for `ADMIN_PASSWORD`)

---

## Step 6: Upload Devices and Start Monitoring

### Create Test CSV

On Ubuntu VM, create `test-devices.csv`:

```bash
nano test-devices.csv
```

**Content:**
```csv
Username,IP Address,Device Name,Link,Network
admin,8.8.8.8,Google-DNS,Link-1,Network-1
admin,1.1.1.1,Cloudflare-DNS,Link-1,Network-1
admin,192.168.1.1,Local-Gateway,Link-2,Network-2
admin,192.168.1.10,Local-Switch,Link-2,Network-2
admin,10.0.0.1,Corporate-Router,Link-3,Network-3
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### Upload via Web UI

1. Go to http://localhost
2. Login as admin
3. Navigate to **Devices** page
4. Click **Import CSV**
5. Select `test-devices.csv`
6. Review preview
7. Click **Confirm Import**
8. Devices imported!

### Wait 30 Seconds

- Wait for first monitoring cycle (30 seconds)
- Go to **Dashboard** page
- Charts should start showing data!
- Latency, bandwidth, packet loss all displayed
- Charts update every 30 seconds automatically

---

## Complete Workflow Summary

```
Windows:
1. Right-click nms-ritvik folder → Send to → Compressed folder
2. Get nms-ritvik.zip

Transfer:
3. Copy to USB / Shared folder / Drag-and-drop

Ubuntu VM:
4. unzip nms-ritvik.zip
5. cd nms-ritvik
6. cp server/.env.example server/.env
7. nano server/.env (change JWT_SECRET and ADMIN_PASSWORD)
8. chmod +x setup-ubuntu.sh
9. ./setup-ubuntu.sh

Browser:
10. http://localhost
11. Login: admin / (your password)
12. Upload devices CSV
13. Done! Monitoring starts in 30 seconds! 🎉
```

---

## File Structure After Unzip

```
~/nms-ritvik/
├── docker-compose.yml           # Docker services config
├── Dockerfile.frontend          # Frontend container
├── setup-ubuntu.sh             # Setup script (run this!)
├── server/
│   ├── .env.example            # Config template
│   ├── .env                    # Your config (create this)
│   ├── Dockerfile              # Backend container
│   ├── package.json
│   └── src/                    # Backend source code
├── src/                        # Frontend source code
├── nginx/                      # Nginx config
├── package.json
├── START_HERE_UBUNTU_VM.md    # Quick start guide
├── README_UBUNTU_VM.md        # Alternative guide
├── UBUNTU_VM_SETUP.md         # Detailed guide
├── UBUNTU_VM_CHECKLIST.md     # Verification checklist
└── [22+ other documentation files]
```

---

## Verification Commands

```bash
# Check services running
docker compose ps

# Check logs
docker compose logs -f

# Check API health
curl http://localhost:4000/api/health

# Check monitoring is working
docker compose logs -f api | grep "Monitoring cycle"

# Should see this every 30 seconds:
# [INFO] Monitoring cycle started for X devices
```

---

## Common Issues & Fixes

### Issue 1: Unzip Not Found
```bash
sudo apt update
sudo apt install unzip
```

### Issue 2: Permission Denied (Docker)
```bash
sudo usermod -aG docker $USER
# Logout and login again
```

### Issue 3: Docker Images Not Found
```bash
# You need to pull images while connected to internet
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull nginx:alpine
```

### Issue 4: Port 80 Already Used
```bash
# Stop conflicting service
sudo systemctl stop apache2
sudo systemctl stop nginx

# Or change port in docker-compose.yml
nano docker-compose.yml
# Change "80:80" to "8080:80"
```

---

## Important Notes

### ⚠️ Do This BEFORE Going Offline:

1. ✅ Install Docker on Ubuntu VM
2. ✅ Install Docker Compose on Ubuntu VM
3. ✅ Pull these 3 Docker images:
   - `postgres:16-alpine`
   - `node:20-alpine`
   - `nginx:alpine`
4. ✅ Add your user to docker group
5. ✅ Test: `docker ps` works without sudo

**After this, you can disconnect from internet and everything will work!**

### 📦 What's NOT Needed from Internet:

- ❌ No NPM packages download (included in Docker build)
- ❌ No external fonts (using system fonts)
- ❌ No external APIs (all self-contained)
- ❌ No GitHub (you have the zip file)
- ❌ No cloud services (everything local)

### ✅ What IS Needed (One-Time):

- ✅ Docker images (postgres, node, nginx) - pull before going offline
- ✅ Docker and Docker Compose installed
- ✅ System packages (build-essential) - optional but recommended

---

## Expected Results

After setup completes:

```
✓ Docker images loaded
✓ Application built (3-5 minutes)
✓ Services started
✓ PostgreSQL ready
✓ API ready
✓ Frontend ready
✓ Access: http://localhost

Login: admin / (your password)

Next steps:
1. Upload devices CSV
2. Wait 30 seconds
3. Dashboard shows monitoring data
4. Charts update every 30 seconds

🚀 Setup completed successfully!
```

---

## Daily Operations

### Start Application
```bash
cd ~/nms-ritvik
docker compose up -d
```

### Stop Application
```bash
cd ~/nms-ritvik
docker compose down
```

### View Logs
```bash
docker compose logs -f
```

### Restart
```bash
docker compose restart
```

### Backup Database
```bash
docker compose exec postgres pg_dump -U nms nms > backup.sql
```

---

## That's It!

**Your complete workflow:**
1. ✅ Zip on Windows
2. ✅ Transfer to Ubuntu VM (any method)
3. ✅ Unzip on Ubuntu VM
4. ✅ Configure `.env`
5. ✅ Run `./setup-ubuntu.sh`
6. ✅ Access http://localhost
7. ✅ Upload devices
8. ✅ Start monitoring! 🎉

**No GitHub, no internet needed (after initial Docker images), just zip and go!** 🚀
