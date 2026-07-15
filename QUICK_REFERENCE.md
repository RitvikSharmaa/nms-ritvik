# ⚡ Quick Reference - Ubuntu 24.04 VM

## TL;DR - After Unzipping

```bash
cd ~/nms-ritvik
cp server/.env.example server/.env
nano server/.env     # Change JWT_SECRET and ADMIN_PASSWORD
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh

# Open browser: http://localhost
# Login: admin / (your password)
# Upload CSV → Wait 30s → Done! 🎉
```

---

## What Happens Automatically ✅

- ✅ PostgreSQL database created
- ✅ 17 tables created with indexes
- ✅ 5 networks seeded (Network-1 to 5)
- ✅ 3 links seeded (Link-1 to 3)
- ✅ Admin user created
- ✅ Default settings configured
- ✅ Monitoring starts automatically
- ✅ Ready to use!

**You don't create anything manually - just configure .env and run!**

---

## Prerequisites (One-Time, While Online)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Pull images (IMPORTANT!)
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull nginx:alpine

# Logout and login
# NOW go offline!
```

---

## Configuration (.env file)

**Only change these two:**
```bash
JWT_SECRET=your-random-32-character-secret-string
ADMIN_PASSWORD=YourStrongPassword123!
```

**Database settings are already correct - DON'T CHANGE:**
```bash
DATABASE_URL=postgresql://nms:nms_secret@postgres:5432/nms
```

---

## Daily Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Logs
docker compose logs -f

# Status
docker compose ps

# Backup
docker compose exec postgres pg_dump -U nms nms > backup.sql
```

---

## CSV Format

```csv
Username,IP Address,Device Name,Link,Network
admin,192.168.1.1,Router-1,Link-1,Network-1
admin,192.168.1.2,Switch-1,Link-1,Network-1
```

**Networks**: Network-1, Network-2, Network-3, Network-4, Network-5  
**Links**: Link-1, Link-2, Link-3

---

## Verification

```bash
# Check services
docker compose ps

# Check database
docker compose exec postgres psql -U nms nms -c "\dt"

# Check monitoring
docker compose logs api | grep "Monitoring cycle"
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Permission denied | `sudo usermod -aG docker $USER` |
| Images not found | `docker pull postgres:16-alpine node:20-alpine nginx:alpine` |
| Port 80 in use | `sudo systemctl stop apache2 nginx` |
| Build fails | `docker system prune -a` |

---

## Access URLs

- **Application**: http://localhost
- **API Health**: http://localhost:4000/api/health
- **API Docs**: http://localhost/api/docs

**Login**: admin / (your .env password)

---

## Files to Read

1. **UBUNTU_24_SETUP.md** ← Complete guide
2. **AFTER_UNZIP_GUIDE.md** ← Step-by-step
3. **START_HERE_UBUNTU_VM.md** ← Quick start

---

## Support

Everything is automatic. Just:
1. Unzip
2. Configure `.env`
3. Run `./setup-ubuntu.sh`
4. Access http://localhost
5. Upload CSV
6. Monitor! 🚀
