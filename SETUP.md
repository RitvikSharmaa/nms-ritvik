# Quick Setup - Ubuntu VM

See **UBUNTU_SETUP.md** for complete step-by-step guide.

## TL;DR

```bash
# 1. Install (while online)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib build-essential python3 libsnmp-dev

# 2. Create database
sudo -u postgres psql -c "CREATE DATABASE nms; CREATE USER nms WITH PASSWORD 'nms_secret'; GRANT ALL PRIVILEGES ON DATABASE nms TO nms;"

# 3. Install dependencies
cd server && npm install
cd .. && npm install

# 4. Configure
cp server/.env.example server/.env
nano server/.env  # Change JWT_SECRET and ADMIN_PASSWORD

# 5. Setup database tables
cd server && npm run migrate:dev

# 6. Run (two terminals)
# Terminal 1: cd server && npm run dev
# Terminal 2: npm run dev

# Access: http://localhost:5173
# Login: admin / (your password)
```

See **UBUNTU_SETUP.md** for detailed instructions and troubleshooting.
