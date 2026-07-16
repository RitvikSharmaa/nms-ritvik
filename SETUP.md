# Quick Setup - Air-Gapped Ubuntu VM

See **UBUNTU_SETUP.md** for complete step-by-step guide.

## Prerequisites (MUST be installed before air-gapping):
- Node.js 16+ (Ubuntu 24.04 has 18+)
- PostgreSQL 12+
- build-essential, python3

## TL;DR - On Air-Gapped VM

```bash
# 1. Check prerequisites installed
node --version    # Need 16+
psql --version    # Need 12+

# 2. Transfer project + unzip
unzip nms-ritvik.zip
cd nms-ritvik

# 3. Create database
sudo -u postgres psql -c "CREATE DATABASE nms; CREATE USER nms WITH PASSWORD 'nms_secret'; GRANT ALL PRIVILEGES ON DATABASE nms TO nms;"

# 4. Dependencies (if node_modules not copied, this needs internet!)
cd server && npm install
cd .. && npm install

# 5. Configure
cp server/.env.example server/.env
nano server/.env  # Change JWT_SECRET and ADMIN_PASSWORD

# 6. Create tables
cd server && npm run migrate:dev

# 7. Run (two terminals)
# Terminal 1: cd server && npm run dev
# Terminal 2: npm run dev

# Access: http://localhost:5173
# Login: admin / (your password)
```

**IMPORTANT:** For air-gapped setup, copy node_modules from a connected machine to avoid needing internet for `npm install`.

See **UBUNTU_SETUP.md** for:
- How to install prerequisites from Ubuntu ISO
- How to copy node_modules from another machine
- Detailed troubleshooting
- CSV import format
