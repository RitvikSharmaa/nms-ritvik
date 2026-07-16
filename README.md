# NetPulse NMS - Network Monitoring System

Real-time network monitoring with ICMP ping + SNMP polling.

## Quick Start

**See UBUNTU_SETUP.md for complete setup guide!**

### What You Need (Ubuntu VM):
- Node.js 20
- PostgreSQL
- This project folder

### Setup:
```bash
# Install Node.js + PostgreSQL (while online)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib build-essential python3 libsnmp-dev

# Create database
sudo -u postgres psql -c "CREATE DATABASE nms; CREATE USER nms WITH PASSWORD 'nms_secret'; GRANT ALL PRIVILEGES ON DATABASE nms TO nms;"

# Install dependencies
cd server && npm install && cd .. && npm install

# Configure
cp server/.env.example server/.env
nano server/.env  # Change JWT_SECRET and ADMIN_PASSWORD

# Create tables
cd server && npm run migrate:dev

# Run (two terminals)
cd server && npm run dev  # Terminal 1
npm run dev               # Terminal 2

# Access: http://localhost:5173
```

### Features:
- ✅ ICMP ping monitoring (latency, packet loss)
- ✅ SNMP bandwidth monitoring
- ✅ Real-time dashboard with charts
- ✅ Device management via CSV import
- ✅ Alert system
- ✅ Report generation (PDF/CSV/XLSX)
- ✅ User management with roles
- ✅ Works completely offline after setup

### CSV Format:
```csv
Username,IP Address,Device Name,Link,Network
admin,192.168.1.1,Router-1,Link-1,Network-1
```

### Default Login:
- Username: `admin`
- Password: (from .env file)

**Full guide: UBUNTU_SETUP.md**
