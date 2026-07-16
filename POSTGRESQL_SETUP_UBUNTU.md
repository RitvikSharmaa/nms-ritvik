# PostgreSQL Setup Guide for Ubuntu 24
## Complete Installation and Configuration for Air-Gapped Deployment

---

## TABLE OF CONTENTS

1. [Installation Methods](#installation-methods)
2. [Method 1: Online Installation](#method-1-online-installation-recommended)
3. [Method 2: Offline Installation](#method-2-offline-installation-air-gapped)
4. [Initial Configuration](#initial-configuration)
5. [Create Database and User](#create-database-and-user)
6. [Security Hardening](#security-hardening)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## INSTALLATION METHODS

### Prerequisites
- Ubuntu 24.04 LTS
- Root or sudo access
- At least 500MB free disk space

### Which Method to Use?

| Scenario | Method |
|----------|--------|
| VM has temporary internet access | Method 1 (Online) |
| VM is already air-gapped | Method 2 (Offline) |
| Fresh Ubuntu installation | Method 1 (Online) |
| Production deployment | Method 2 (Offline) |

---

## METHOD 1: ONLINE INSTALLATION (Recommended)

### Step 1: Update Package Lists

```bash
sudo apt update
```

### Step 2: Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

**What gets installed:**
- PostgreSQL 14 (Ubuntu 24.04 default version)
- PostgreSQL client tools
- Additional contributed modules

**Installation time:** 2-5 minutes

### Step 3: Verify Installation

```bash
# Check PostgreSQL version
psql --version
# Output: psql (PostgreSQL) 14.x

# Check service status
sudo systemctl status postgresql
# Output: active (running)
```

### Step 4: Enable Auto-Start

```bash
sudo systemctl enable postgresql
```

✅ **PostgreSQL is now installed and running!**

---

## METHOD 2: OFFLINE INSTALLATION (Air-Gapped)

### Option A: Using Ubuntu Installation ISO

#### Step 1: Mount Ubuntu ISO

```bash
# Create mount point
sudo mkdir -p /mnt/cdrom

# Mount ISO (adjust path to your ISO file)
sudo mount -o loop /path/to/ubuntu-24.04-desktop-amd64.iso /mnt/cdrom

# Verify mount
ls /mnt/cdrom
```

#### Step 2: Add ISO as APT Source

```bash
# Add CD-ROM as package source
sudo apt-cdrom -m -d /mnt/cdrom add

# Update package list (uses ISO, not internet)
sudo apt update
```

#### Step 3: Install PostgreSQL from ISO

```bash
sudo apt install postgresql postgresql-contrib
```

#### Step 4: Unmount ISO

```bash
sudo umount /mnt/cdrom
```

### Option B: Using Downloaded .deb Packages

#### On a Connected Machine (Same Ubuntu Version):

```bash
# Download PostgreSQL packages and dependencies
mkdir ~/postgresql-packages
cd ~/postgresql-packages

# Download main packages
apt download postgresql postgresql-contrib postgresql-14 \
  postgresql-client-14 postgresql-common \
  libpq5 libpq-dev postgresql-client-common

# Download all dependencies
apt-cache depends postgresql | grep Depends | \
  sed 's/.*Depends: //' | xargs apt download

# Create tarball
cd ~
tar -czf postgresql-packages.tar.gz postgresql-packages/
```

#### On Air-Gapped Ubuntu VM:

```bash
# Transfer postgresql-packages.tar.gz via USB

# Extract packages
tar -xzf postgresql-packages.tar.gz
cd postgresql-packages/

# Install packages
sudo dpkg -i *.deb

# Fix any dependency issues
sudo apt --fix-broken install
```

---

## INITIAL CONFIGURATION

### Step 1: Start PostgreSQL Service

```bash
# Start service
sudo systemctl start postgresql

# Enable auto-start on boot
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

**Expected output:**
```
● postgresql.service - PostgreSQL RDBMS
     Loaded: loaded (/lib/systemd/system/postgresql.service; enabled)
     Active: active (exited) since [timestamp]
```

### Step 2: Access PostgreSQL

```bash
# Switch to postgres user
sudo -i -u postgres

# Access PostgreSQL prompt
psql

# You should see:
psql (14.x (Ubuntu 14.x-xUbuntu24.04))
Type "help" for help.

postgres=#
```

### Step 3: Set PostgreSQL Password (Optional)

```bash
# Inside psql prompt
ALTER USER postgres WITH PASSWORD 'your_secure_password';

# Exit psql
\q

# Exit postgres user
exit
```

---

## CREATE DATABASE AND USER

### For Setu NMS Application

```bash
# Method A: One-liner (Recommended)
sudo -u postgres psql << EOF
CREATE DATABASE setu_nms;
CREATE USER setu WITH PASSWORD 'setu_secret_2024';
GRANT ALL PRIVILEGES ON DATABASE setu_nms TO setu;
ALTER DATABASE setu_nms OWNER TO setu;
\q
EOF
```

```bash
# Method B: Interactive
sudo -u postgres psql

# Inside psql prompt:
CREATE DATABASE setu_nms;
CREATE USER setu WITH PASSWORD 'setu_secret_2024';
GRANT ALL PRIVILEGES ON DATABASE setu_nms TO setu;
ALTER DATABASE setu_nms OWNER TO setu;

# List databases to verify
\l

# Should show:
#    Name    | Owner | Encoding | Collate | Ctype | Access privileges
# -----------+-------+----------+---------+-------+------------------
#  setu_nms  | setu  | UTF8     | ...     | ...   | 

# Exit
\q
```

### Verify User and Database

```bash
# List all databases
sudo -u postgres psql -l | grep setu_nms

# Connect to database as setu user (test connection)
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "SELECT 1;"

# Should return:
#  ?column? 
# ----------
#         1
```

✅ **Database and user created successfully!**

---

## SECURITY HARDENING

### Step 1: Configure Host-Based Authentication

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

**Add/modify these lines:**
```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             setu                                    md5
local   setu_nms        setu                                    md5

# IPv4 local connections
host    all             all             127.0.0.1/32            scram-sha-256
host    setu_nms        setu            127.0.0.1/32            scram-sha-256

# IPv6 local connections  
host    all             all             ::1/128                 scram-sha-256
```

**Save:** Ctrl+O, Enter, Ctrl+X

### Step 2: Configure PostgreSQL to Listen Only on Localhost

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**Find and set:**
```conf
listen_addresses = 'localhost'
port = 5432
max_connections = 100
```

**Save:** Ctrl+O, Enter, Ctrl+X

### Step 3: Restart PostgreSQL

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

### Step 4: Set File Permissions

```bash
# Restrict .env file permissions (after creating it)
chmod 600 ~/setu-nms/server/.env
```

---

## VERIFICATION

### Complete Verification Checklist

```bash
# 1. Check PostgreSQL version
psql --version
# Expected: psql (PostgreSQL) 14.x

# 2. Check service running
sudo systemctl status postgresql | grep Active
# Expected: Active: active (exited)

# 3. Check port listening
sudo netstat -tlnp | grep 5432
# Expected: tcp 0 0 127.0.0.1:5432 ... LISTEN

# 4. List databases
sudo -u postgres psql -l | grep setu
# Expected: setu_nms | setu | UTF8 | ...

# 5. Test connection
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "SELECT version();"
# Expected: PostgreSQL 14.x on x86_64-pc-linux-gnu, compiled by gcc...

# 6. Test user permissions
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "CREATE TABLE test_table (id INT); DROP TABLE test_table;"
# Expected: CREATE TABLE / DROP TABLE (no errors)

# 7. Check logs (if issues)
sudo tail -n 50 /var/log/postgresql/postgresql-14-main.log
```

### All Checks Pass? ✅

If all commands above execute successfully, PostgreSQL is properly configured!

---

## TROUBLESHOOTING

### Issue: Service Won't Start

```bash
# Check PostgreSQL logs
sudo journalctl -u postgresql -n 50 --no-pager

# Or check PostgreSQL log file
sudo tail -100 /var/log/postgresql/postgresql-14-main.log

# Check disk space
df -h /var/lib/postgresql

# Fix permissions
sudo chown -R postgres:postgres /var/lib/postgresql/14/main
sudo chmod 700 /var/lib/postgresql/14/main
```

### Issue: Cannot Connect to Database

```bash
# Check if PostgreSQL is listening
sudo netstat -tlnp | grep 5432

# Check if service is running
sudo systemctl status postgresql

# Try connecting as postgres user
sudo -u postgres psql -c "SELECT 1;"

# Check authentication configuration
sudo cat /etc/postgresql/14/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

### Issue: Authentication Failed

```bash
# Check user exists
sudo -u postgres psql -c "\du"

# Reset user password
sudo -u postgres psql -c "ALTER USER setu WITH PASSWORD 'new_password';"

# Update .env file with new password
nano ~/setu-nms/server/.env
```

### Issue: Database Does Not Exist

```bash
# Check if database exists
sudo -u postgres psql -l | grep setu

# Recreate database if missing
sudo -u postgres psql -c "CREATE DATABASE setu_nms;"
sudo -u postgres psql -c "ALTER DATABASE setu_nms OWNER TO setu;"
```

### Issue: Permission Denied

```bash
# Grant all privileges again
sudo -u postgres psql << EOF
GRANT ALL PRIVILEGES ON DATABASE setu_nms TO setu;
ALTER DATABASE setu_nms OWNER TO setu;
\c setu_nms
GRANT ALL ON SCHEMA public TO setu;
EOF
```

### Issue: Port Already in Use

```bash
# Check what's using port 5432
sudo lsof -i :5432

# If another PostgreSQL instance
sudo systemctl stop postgresql@13-main  # Old version
sudo systemctl disable postgresql@13-main

# Restart correct version
sudo systemctl restart postgresql
```

---

## BACKUP AND RESTORE

### Create Backup

```bash
# Backup database
sudo -u postgres pg_dump setu_nms > ~/setu_backup_$(date +%Y%m%d).sql

# Compressed backup
sudo -u postgres pg_dump setu_nms | gzip > ~/setu_backup_$(date +%Y%m%d).sql.gz

# Verify backup file
ls -lh ~/setu_backup_*.sql
```

### Restore Backup

```bash
# Drop existing database (careful!)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS setu_nms;"

# Recreate database
sudo -u postgres psql -c "CREATE DATABASE setu_nms OWNER setu;"

# Restore from backup
sudo -u postgres psql setu_nms < ~/setu_backup_20240717.sql

# Or from compressed backup
gunzip -c ~/setu_backup_20240717.sql.gz | sudo -u postgres psql setu_nms
```

---

## MAINTENANCE TASKS

### Regular Maintenance

```bash
# Vacuum database (reclaim space)
sudo -u postgres psql setu_nms -c "VACUUM ANALYZE;"

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('setu_nms'));"

# Check table sizes
sudo -u postgres psql setu_nms -c "\dt+"
```

### Automatic Vacuuming

PostgreSQL on Ubuntu 24 has autovacuum enabled by default. Verify:

```bash
sudo -u postgres psql -c "SHOW autovacuum;"
# Should be: on
```

---

## USEFUL COMMANDS

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check status
sudo systemctl status postgresql

# Enable auto-start
sudo systemctl enable postgresql

# Disable auto-start
sudo systemctl disable postgresql

# View logs
sudo journalctl -u postgresql -f

# Access PostgreSQL as postgres user
sudo -u postgres psql

# Access specific database
sudo -u postgres psql -d setu_nms

# Execute SQL command
sudo -u postgres psql -c "SELECT version();"

# List databases
sudo -u postgres psql -l

# List users
sudo -u postgres psql -c "\du"
```

---

## POSTGRESQL CONFIGURATION FILES

| File | Location | Purpose |
|------|----------|---------|
| postgresql.conf | /etc/postgresql/14/main/ | Main configuration |
| pg_hba.conf | /etc/postgresql/14/main/ | Authentication rules |
| Data directory | /var/lib/postgresql/14/main/ | Database files |
| Log files | /var/log/postgresql/ | Error and query logs |

---

## NEXT STEPS

After PostgreSQL is configured:

1. ✅ PostgreSQL installed and running
2. ✅ Database `setu_nms` created
3. ✅ User `setu` created with permissions

**Continue with Setu NMS deployment:**

```bash
cd ~/setu-nms/server

# Configure application
cp .env.example .env
nano .env  # Set DATABASE_URL

# Run migrations
npm run migrate

# Start application
npm start
```

---

## QUICK REFERENCE

**Create database for Setu NMS:**
```bash
sudo -u postgres psql -c "CREATE DATABASE setu_nms;"
sudo -u postgres psql -c "CREATE USER setu WITH PASSWORD 'setu_secret_2024';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE setu_nms TO setu;"
```

**Test connection:**
```bash
psql postgresql://setu:setu_secret_2024@localhost:5432/setu_nms -c "SELECT 1;"
```

**Connection string for .env:**
```
DATABASE_URL=postgresql://setu:setu_secret_2024@localhost:5432/setu_nms
```

---

**PostgreSQL Setup Complete!** ✅

For Setu NMS deployment, continue with BUILD_AND_DEPLOY_INSTRUCTIONS.md
