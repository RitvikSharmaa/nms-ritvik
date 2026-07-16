# Ubuntu VM Setup - Air-Gapped/Offline

## Step 1: Zip This Folder on Windows

**Right-click `nms-ritvik` folder → "Send to" → "Compressed (zipped) folder"**

OR use PowerShell:
```powershell
Compress-Archive -Path "nms-ritvik" -DestinationPath "nms-ritvik.zip"
```

**Folder size:** ~430 MB (zips to ~150-200 MB)

**What's included:**
- ✅ 662 npm packages (274 frontend + 388 backend)
- ✅ All source code
- ✅ Database migrations
- ✅ Documentation

---

## IMPORTANT: This Folder Is Ready to Go!

✅ **All npm packages are already installed in this folder!**
- `node_modules/` - Frontend packages (React, TanStack, Recharts, etc.)
- `server/node_modules/` - Backend packages (Express, PostgreSQL, Socket.io, etc.)

**Just zip, transfer to Ubuntu VM, unzip, and run!**

---

## Prerequisites on Ubuntu VM

Your Ubuntu 24.04 VM **MUST** have these installed:

### Check What You Have:
```bash
node --version   # Need 16.x or higher (18 or 20 is best)
npm --version    # Need 8.x or higher
psql --version   # Need 12.x or higher
```

### If Missing - Install from Ubuntu ISO (Air-Gapped Method):

**Mount Ubuntu installation media:**
```bash
# Insert Ubuntu USB or mount ISO
sudo mkdir -p /mnt/cdrom
sudo mount -o loop /path/to/ubuntu-24.04.iso /mnt/cdrom

# Or if USB drive
sudo mount /dev/sdb1 /mnt/cdrom  # Check with 'lsblk' for correct device

# Add as apt source
sudo apt-cdrom -m -d /mnt/cdrom add

# Install packages (NO INTERNET NEEDED)
sudo apt install nodejs npm postgresql postgresql-contrib build-essential python3

# Verify
node --version    # Should be 18+ on Ubuntu 24.04
npm --version     # Should be 9+
psql --version    # Should be 14+

# Unmount
sudo umount /mnt/cdrom
```

**Alternative - If already installed on Ubuntu:**
Most Ubuntu 24.04 installations include these by default. Just verify versions above.

---

---

## Step 2: Transfer Project to Ubuntu VM

**On Windows (your current machine):**
```bash
# Zip entire folder (includes node_modules!)
# Use 7-Zip, WinRAR, or Windows built-in zip
# Right-click folder > Send to > Compressed folder
# OR use PowerShell:
Compress-Archive -Path "nms-ritvik" -DestinationPath "nms-ritvik.zip"
```

**Transfer to Ubuntu VM:**
- Copy `nms-ritvik.zip` to USB drive
- OR use shared folder (VMware/VirtualBox)
- OR use network share

**On Ubuntu VM:**
```bash
# Copy zip file to home directory
cp /media/usb/nms-ritvik.zip ~/
# OR cp /mnt/shared/nms-ritvik.zip ~/

# Unzip
cd ~
unzip nms-ritvik.zip
cd nms-ritvik

# Verify node_modules exist
ls node_modules/          # Should show MANY folders
ls server/node_modules/   # Should show MANY folders
```

---

## Step 3: Check What You Have

```bash
# Check Node.js version
node --version

# If less than v16, you have a problem - need Node 16+
# Most Ubuntu 20.04+ has Node 12-16 which should work
```

---

## Step 4: Setup Database

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE nms;
CREATE USER nms WITH PASSWORD 'nms_secret';
GRANT ALL PRIVILEGES ON DATABASE nms TO nms;
ALTER DATABASE nms OWNER TO nms;
\q
EOF
```

### Verify Database Created
```bash
sudo -u postgres psql -l | grep nms
# Should show: nms | nms | ...
```

---

## Step 5: Verify Dependencies (Already Installed!)

**Good news: All npm packages are already in the zip file!**

Just verify they exist:
```bash
ls node_modules/          # Should show many folders (React, TanStack, etc.)
ls server/node_modules/   # Should show many folders (Express, PostgreSQL, etc.)
```

**If you see folders, you're good!** No npm install needed - everything works offline.

**If folders are missing somehow:**
- You need to re-download the zip file with node_modules included
- OR give VM temporary internet access and run: `npm install && cd server && npm install`

---

## Step 5: Configure Environment

```bash
cp server/.env.example server/.env
nano server/.env
```

**Change these two lines:**
```bash
JWT_SECRET=your-super-secret-random-32-char-string-change-this
ADMIN_PASSWORD=YourPassword123!
```

**Make sure database URL is correct:**
```bash
DATABASE_URL=postgresql://nms:nms_secret@localhost:5432/nms
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Step 6: Run Database Migrations

This creates all 17 tables automatically:

```bash
cd server
npm run migrate:dev
```

**Expected output:**
```
[INFO] Applying migration 001_init.sql
[INFO] Applying migration 002_production_improvements.sql
[INFO] Applying migration 003_metrics_partitioning_optional.sql
[INFO] Created initial admin user "admin"
[INFO] Migrations complete
```

### Verify Tables Created
```bash
sudo -u postgres psql -d nms -c "\dt"
```

Should show 17 tables: users, roles, devices, networks, links, etc.

---

## Step 7: Start Application

### Option A: Two Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
cd ~/nms-ritvik/server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd ~/nms-ritvik
npm run dev
```

### Option B: One Command (Background)

```bash
cd ~/nms-ritvik
chmod +x start.sh
./start.sh
```

---

## Step 8: Access Application

**Open browser and go to:**
```
http://localhost:5173
```

**Login:**
- Username: `admin`
- Password: (whatever you set in step 5)

---

## Step 9: Upload Devices

1. Click **Devices** in left menu
2. Click **Import CSV**
3. Upload your CSV file (format below)
4. Click **Confirm Import**
5. Wait 30 seconds
6. Go to **Dashboard** - you'll see monitoring data!

### CSV Format:
```csv
Username,IP Address,Device Name,Link,Network
admin,192.168.1.1,Router-1,Link-1,Network-1
admin,192.168.1.2,Switch-1,Link-1,Network-1
admin,192.168.2.1,Branch-Router,Link-2,Network-2
```

**Networks:** Network-1, Network-2, Network-3, Network-4, Network-5
**Links:** Link-1, Link-2, Link-3

---

## Troubleshooting

### Issue: `npm install` fails with "Permission denied"
```bash
sudo chown -R $USER:$USER ~/.npm
```

### Issue: PostgreSQL not accepting connections
```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

### Issue: Database migration fails
```bash
# Check if database exists
sudo -u postgres psql -l

# If not, create it again:
sudo -u postgres psql -c "CREATE DATABASE nms;"
sudo -u postgres psql -c "CREATE USER nms WITH PASSWORD 'nms_secret';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nms TO nms;"
```

### Issue: Backend won't start - "Cannot find module"
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

### Issue: Frontend shows blank page
```bash
# Check if backend is running
curl http://localhost:4000/api/health

# Should return: {"status":"ok"}
```

### Issue: ICMP ping permission denied
```bash
# Give node permission to use ICMP
sudo setcap cap_net_raw+ep $(which node)
```

---

## Daily Use

### Start Application:
```bash
cd ~/nms-ritvik
# Terminal 1
cd server && npm run dev

# Terminal 2
npm run dev
```

### Stop Application:
Press `Ctrl+C` in both terminals

### View Logs:
Logs are shown in the terminal where you ran `npm run dev`

---

## What Gets Created Automatically

✅ **17 Database Tables:**
- users, roles, permissions, role_permissions
- networks (Network-1 to 5)
- links (Link-1 to 3)
- devices (your devices)
- device_links
- metrics (monitoring data)
- alerts, alert_history
- uploads, reports
- settings, audit_logs, notification_history, system_logs

✅ **Admin User:**
- Username: admin
- Password: (from your .env)

✅ **5 Networks & 3 Links** pre-seeded

✅ **Monitoring Engine:**
- Runs every 30 seconds
- ICMP ping (latency, packet loss)
- SNMP polling (bandwidth)

---

## No External Dependencies After Setup!

Once you run `npm install`, everything works offline:
- All npm packages are in `node_modules/`
- Database is local PostgreSQL
- No Docker needed
- No internet needed
- No external APIs

Just Node.js + PostgreSQL + this project = Works!

---

## Quick Commands Reference

```bash
# Database
sudo -u postgres psql -d nms              # Connect to database
sudo -u postgres psql -d nms -c "\dt"     # List tables
sudo systemctl status postgresql          # Check PostgreSQL status

# Application
cd ~/nms-ritvik/server && npm run dev     # Start backend
cd ~/nms-ritvik && npm run dev            # Start frontend
./start.sh                                # Start both

# Verify
curl http://localhost:4000/api/health     # Backend health
curl http://localhost:5173                # Frontend
```

---

## System Requirements

- Ubuntu 20.04 or 22.04 or 24.04
- Node.js 20.x
- PostgreSQL 12+
- 2GB RAM minimum
- 10GB disk space

---

## That's It!

Your application will run completely offline on Ubuntu VM with:
- Local PostgreSQL database
- Local Node.js backend
- Local frontend
- No Docker
- No internet after initial setup

🚀 Ready to monitor your network!
