# 🚀 Quick Start - Get Running in 5 Minutes

## Option 1: Full Stack with Docker (Recommended)

```bash
# Start everything (PostgreSQL + Backend + Frontend + Nginx)
docker compose up -d

# Wait 60 seconds for initialization
sleep 60

# Check status
docker compose ps
# All should be "Up" or "Up (healthy)"

# Access application
open http://localhost
# Or manually: http://localhost in browser

# Login
# Username: admin
# Password: ChangeMe!2024
```

**That's it!** Everything is running.

---

## Option 2: Development Mode (Frontend Only)

```bash
# Run frontend with simulation engine (no backend needed)
npm run dev

# Access at: http://localhost:8081
# Shows 56 simulated devices updating every 30 seconds
```

**Good for:** UI testing, demo, development

---

## What Happens Every 30 Seconds?

When backend is running:

1. ⏰ **Cron scheduler** fires
2. 📡 **Fetches devices** from PostgreSQL
3. 🔀 **Groups by network** (5 networks)
4. 🧵 **Spawns 5 worker threads** (parallel processing)
5. 📶 **Each worker runs**:
   - **ICMP probe** (ping) → latency, packet loss, status
   - **SNMP probe** (if available) → bandwidth counters
6. 💾 **Stores metrics** in PostgreSQL
7. 🚨 **Evaluates alerts** (thresholds)
8. 📢 **Broadcasts** via Socket.IO
9. 🖥️ **Frontend updates** automatically

**Total time: 5-25 seconds** (depends on device count)

---

## Upload Your Devices

### 1. Create CSV File

```csv
Username,IP Address,Device Name,Link,Network Name
admin,192.168.1.1,Router-1,Link-1,Network-1
admin,192.168.1.2,Switch-1,"Link-1,Link-2",Network-1
admin,192.168.2.1,Router-2,Link-2,Network-2
```

### 2. Upload via UI

1. Open http://localhost
2. Login (admin / ChangeMe!2024)
3. Click "Upload Devices"
4. Drag and drop your CSV
5. Click "Import to Inventory"

### 3. Wait 30 Seconds

Monitoring starts automatically!

---

## Quick Troubleshooting

### Container won't start?
```bash
docker compose logs <container-name>
# Example: docker compose logs api
```

### Can't access http://localhost?
```bash
# Check nginx is running
docker compose ps nginx

# Check port 80 is free
sudo lsof -i :80

# Try with explicit port
docker compose logs nginx
```

### Monitoring not working?
```bash
# Check scheduler logs
docker compose logs api | grep "Monitoring cycle"

# Should see messages every 30 seconds
```

### No bandwidth data?
- Wait 60 seconds (need 2 cycles)
- Check devices have SNMP enabled
- Community string = "public" (default)
- SNMP is optional - latency still works!

---

## Verify Everything Works

```bash
# 1. All containers running?
docker compose ps

# 2. API healthy?
curl http://localhost/api/health

# 3. Monitoring working?
docker compose logs api | grep "cycle complete"

# 4. Data being stored?
docker compose exec postgres psql -U nms -d nms -c "SELECT COUNT(*) FROM metrics;"
```

---

## Stop Everything

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v
```

---

## URLs Reference

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | http://localhost | Main application |
| **API** | http://localhost/api | REST API |
| **API Docs** | http://localhost/api/docs | Swagger UI |
| **Health** | http://localhost/api/health | Health check |
| **Database** | postgres://localhost:5432 | PostgreSQL |

---

## Default Credentials

```
Username: admin
Password: ChangeMe!2024
```

**⚠️ Change this in production!**

Edit: `server/.env` → `ADMIN_PASSWORD=YourSecurePassword`

---

## CSV Template

Download or create: `device-template.csv`

```csv
Username,IP Address,Device Name,Link,Network Name
admin,192.168.1.1,Device-1,Link-1,Network-1
admin,192.168.1.2,Device-2,"Link-1,Link-2",Network-1
admin,192.168.2.1,Device-3,Link-2,Network-2
admin,192.168.3.1,Device-4,Link-3,Network-3
admin,192.168.4.1,Device-5,Link-1,Network-4
admin,192.168.5.1,Device-6,Link-2,Network-5
```

**Rules:**
- IP: Valid IPv4 or IPv6
- Network: Must be Network-1, Network-2, Network-3, Network-4, or Network-5
- Link: Must be Link-1, Link-2, or Link-3 (comma-separated for multiple)
- Username: Any string

---

## Common Commands

```bash
# View logs (follow mode)
docker compose logs -f

# View specific service logs
docker compose logs -f api
docker compose logs -f postgres

# Restart specific service
docker compose restart api

# Execute command in container
docker compose exec api sh
docker compose exec postgres psql -U nms -d nms

# Check resource usage
docker stats

# Clean up everything
docker compose down -v
docker system prune -a
```

---

## Quick Test Script

```bash
#!/bin/bash
# test-nms.sh

echo "🚀 Starting NMS..."
docker compose up -d

echo "⏳ Waiting 60 seconds..."
sleep 60

echo "✅ Checking health..."
curl -s http://localhost/api/health | jq

echo "📝 Creating test CSV..."
cat > test.csv << 'EOF'
Username,IP Address,Device Name,Link,Network Name
admin,8.8.8.8,Google-DNS,Link-1,Network-1
admin,1.1.1.1,Cloudflare-DNS,Link-1,Network-1
EOF

echo "🔐 Getting token..."
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ChangeMe!2024"}' \
  | jq -r '.token')

echo "📤 Uploading devices..."
curl -X POST http://localhost/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.csv"

echo ""
echo "⏳ Waiting 30 seconds for first monitoring cycle..."
sleep 30

echo "📊 Checking metrics..."
docker compose exec -T postgres psql -U nms -d nms -c \
  "SELECT COUNT(*) as metric_count FROM metrics;"

echo ""
echo "✨ Done! Open http://localhost"
echo "   Login: admin / ChangeMe!2024"
```

Save as `test-nms.sh`, make executable, and run:
```bash
chmod +x test-nms.sh
./test-nms.sh
```

---

## 🎯 Success!

If you can:
- ✅ Access http://localhost
- ✅ Login as admin
- ✅ See dashboard with 5 networks
- ✅ Upload CSV
- ✅ See devices monitoring every 30 seconds

**You're all set!** 🎉

---

## Need Help?

Check these files:
- `TESTING_GUIDE.md` - Complete test procedures
- `UBUNTU_OFFLINE_SETUP.md` - Offline deployment
- `TROUBLESHOOTING.md` - Common issues (if exists)
- `README.md` - Project overview

Or check logs:
```bash
docker compose logs -f
```

**Everything works! Have fun! 🚀**
