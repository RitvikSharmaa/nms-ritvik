# 🚀 Simple Setup - No Docker Needed!

## Quick Setup (Ubuntu VM - Offline)

### Prerequisites (Install on Ubuntu VM while connected):

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verify
node --version  # Should be v20.x
npm --version
psql --version
```

### After Unzip on Ubuntu VM:

```bash
cd nms-ritvik

# 1. Setup Database
sudo -u postgres psql -c "CREATE DATABASE nms;"
sudo -u postgres psql -c "CREATE USER nms WITH PASSWORD 'nms_secret';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nms TO nms;"

# 2. Install Dependencies
cd server
npm install
cd ..
npm install

# 3. Configure
cp server/.env.example server/.env
nano server/.env
# Change JWT_SECRET and ADMIN_PASSWORD

# 4. Run Migrations
cd server
npm run migrate
cd ..

# 5. Start Backend (in one terminal)
cd server
npm run dev

# 6. Start Frontend (in another terminal)
npm run dev

# Access: http://localhost:5173
```

## Single Command Run (After Initial Setup)

Create `start.sh`:
```bash
#!/bin/bash
cd server && npm run dev &
npm run dev
```

Then:
```bash
chmod +x start.sh
./start.sh
```

## Default Credentials
- Username: `admin`
- Password: (from your .env file)
