# Ubuntu VM Setup - Complete Offline Guide

## Step 1: Prerequisites (Do This ONCE While Online)

### Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
```

### Install Build Tools (for native modules like bcrypt, net-snmp)
```bash
sudo apt install -y build-essential python3 libsnmp-dev
```

### Start PostgreSQL
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Verify Installation
```bash
node --version    # Should show v20.x
npm --version
psql --version
```

---

## Step 2: Transfer Project to Ubuntu VM

Zip this folder on Windows, transfer to Ubuntu VM (USB/shared folder), then unzip:
```bash
unzip nms-ritvik.zip
cd nms-ritvik
```

---

## Step 3: Setup Database

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

## Step 4: Install Dependencies (Works Offline!)

All npm packages will be downloaded while you're online, then they work offline.

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ..
npm install
```

**This will take 5-10 minutes. All packages are cached in node_modules.**

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
