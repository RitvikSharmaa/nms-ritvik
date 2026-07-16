# NetPulse NMS - Network Monitoring System

Simple network monitoring with ICMP ping + SNMP polling.

## Quick Setup (Ubuntu VM - Offline)

### 1. Prerequisites (Install while connected):
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

### 2. Setup Database:
```bash
sudo -u postgres psql -c "CREATE DATABASE nms;"
sudo -u postgres psql -c "CREATE USER nms WITH PASSWORD 'nms_secret';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nms TO nms;"
```

### 3. Install Dependencies:
```bash
cd server && npm install
cd .. && npm install
```

### 4. Configure:
```bash
cp server/.env.example server/.env
nano server/.env
# Change: JWT_SECRET and ADMIN_PASSWORD
```

### 5. Run Migrations:
```bash
cd server && npm run migrate
```

### 6. Start Application:
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend  
npm run dev
```

Access: http://localhost:5173

## CSV Format
```csv
Username,IP Address,Device Name,Link,Network
admin,192.168.1.1,Router-1,Link-1,Network-1
```

Networks: Network-1 to Network-5
Links: Link-1 to Link-3

## Default Login
- Username: `admin`
- Password: (from .env file)
