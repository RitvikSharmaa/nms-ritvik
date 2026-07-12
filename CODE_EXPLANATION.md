# Complete Code Explanation Guide

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Backend Core Components](#backend-core-components)
3. [Monitoring Engine Deep Dive](#monitoring-engine-deep-dive)
4. [Database Layer](#database-layer)
5. [API Routes](#api-routes)
6. [Frontend Architecture](#frontend-architecture)
7. [Key Concepts & Patterns](#key-concepts--patterns)

---

## System Architecture Overview

### High-Level Flow
```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Browser   │────▶│    nginx     │────▶│  Frontend  │
│             │◀────│  (Port 80)   │◀────│  (React)   │
└─────────────┘     └──────────────┘     └────────────┘
                            │
                            │ /api/* & /socket.io/*
                            ▼
                    ┌──────────────┐
                    │  Backend API │
                    │  (Express)   │
                    │   Port 4000  │
                    └──────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
        ┌─────────┐  ┌──────────┐  ┌─────────┐
        │PostgreSQL│  │Socket.IO │  │ Workers │
        │   DB     │  │Real-time │  │ Threads │
        └─────────┘  └──────────┘  └─────────┘
```

---

## Backend Core Components

### 1. Server Entry Point (`server/src/index.ts`)

**Purpose**: This is where the server starts. Think of it as the "main()" function.

**What it does step-by-step:**

1. **Runs Database Migrations**
   - Checks what version the database is at
   - Runs any new migration files to update schema
   - Creates tables if first time running
   - Seeds fixed data (networks, links, roles)

2. **Creates Express App**
   - Sets up all the middleware (security, logging, etc.)
   - Mounts all API routes under /api
   - Configures error handlers

3. **Attaches Socket.IO**
   - Enables real-time push notifications to browsers
   - Used for live monitoring updates
   - No polling needed from frontend

4. **Starts HTTP Server**
   - Listens on port 4000 (configurable)
   - Accepts incoming requests

5. **Starts Monitoring Engine**
   - Begins the 30-second polling cycle
   - Starts nightly cleanup job
   - Starts database pool monitoring

6. **Registers Shutdown Handlers**
   - Catches Ctrl+C and Docker stop signals
   - Cleans up resources gracefully
   - Prevents data corruption

**Key Code Pattern:**
```typescript
async function main() {
  // Setup phase (order matters!)
  await runMigrations();        // Step 1: Database must be ready
  const app = createApp();      // Step 2: Configure Express
  const server = createServer(app);  // Step 3: Create HTTP server
  initSocketIo(server);         // Step 4: Attach WebSocket
  server.listen(4000);          // Step 5: Start accepting requests
  
  // Background jobs
  startScheduler();             // Step 6: Begin monitoring
  startRetentionJob();          // Step 7: Schedule cleanup
  
  // Cleanup handlers
  process.on('SIGTERM', shutdown);  // Graceful exit
}
```

---

### 2. Express App Factory (`server/src/app.ts`)

**Purpose**: Configures the Express application with all middleware.

**Middleware Stack (executes in this exact order):**

1. **Trust Proxy** (`app.set('trust proxy', 1)`)
   - Why: We're behind nginx in production
   - Effect: req.ip shows real client IP, not nginx's IP
   - Security: Only enable if behind trusted proxy!

2. **Helmet** (Security Headers)
   ```typescript
   app.use(helmet());
   ```
   - Sets X-Frame-Options (prevents clickjacking)
   - Sets X-Content-Type-Options (prevents MIME sniffing)
   - Sets X-XSS-Protection (enables browser XSS filter)
   - And 10+ more security headers

3. **CORS** (Cross-Origin Resource Sharing)
   ```typescript
   app.use(cors({ origin: env.corsOrigin, credentials: true }));
   ```
   - Allows frontend to call API from different port
   - In dev: Frontend on :5173, API on :4000
   - In prod: Both served from same origin via nginx

4. **JSON Body Parser**
   ```typescript
   app.use(express.json({ limit: '1mb' }));
   ```
   - Parses incoming JSON requests
   - Makes it available at req.body
   - Rejects bodies > 1MB (DOS protection)

5. **Morgan Logger**
   ```typescript
   app.use(morgan('combined', { stream: winstonStream }));
   ```
   - Logs every HTTP request
   - Format: "IP - - [date] "GET /api/devices HTTP/1.1" 200 1234"
   - Piped to Winston for file rotation

6. **Swagger Documentation**
   ```typescript
   app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
   ```
   - Interactive API docs at /api/docs
   - Auto-generated from JSDoc comments
   - Try-it-out feature for testing

7. **API Routes**
   ```typescript
   app.use('/api', apiRouter);
   ```
   - All endpoints mounted under /api prefix
   - See routes/api.ts for full list

8. **404 Handler**
   - Catches undefined routes
   - Returns: `{ error: "Not Found", path: "..." }`

9. **Error Handler**
   - Catches all errors from routes
   - Formats consistent error response
   - Logs errors to Winston

**Why This Order Matters:**
- Security middleware (Helmet, CORS) MUST be first
- Body parser MUST come before routes (routes need req.body)
- Error handlers MUST be last (catch errors from previous middleware)

---

## Monitoring Engine Deep Dive

### Architecture Overview

The monitoring engine is the **heart of the NMS**. It's responsible for:
- Polling devices every 30 seconds
- Collecting metrics (latency, packet loss, bandwidth)
- Evaluating alert thresholds
- Broadcasting updates to connected clients

### Key Components

#### 1. Scheduler (`monitoring/scheduler.ts`)

**Responsibilities:**
- Run monitoring cycle every 30 seconds (configurable)
- Partition devices by network
- Spawn worker threads for parallel polling
- Aggregate results and store metrics
- Evaluate alert conditions
- Broadcast via Socket.IO

**Monitoring Cycle Flow:**

```
Every 30 seconds (cron job):
  │
  ├─ 1. Fetch all devices from database
  ├─ 2. Fetch current settings (thresholds)
  ├─ 3. Partition devices by network_id
  │     Example: Network-1: [dev1, dev2, dev3]
  │              Network-2: [dev4, dev5]
  │
  ├─ 4. Spawn 1 worker thread per network (parallel)
  │     │
  │     └─ Worker polls devices via ICMP + SNMP
  │        Returns: [{ alive, latency, loss, octets }]
  │
  ├─ 5. Collect results from all workers
  │
  ├─ 6. Compute bandwidth deltas
  │     Compare current octets with previous cycle
  │     Handle 32-bit counter wraparound
  │     Convert to Mbps
  │
  ├─ 7. Determine device status
  │     - down: ICMP failed
  │     - degraded: high latency or packet loss
  │     - up: everything normal
  │
  ├─ 8. Batch insert metrics to PostgreSQL
  │     INSERT INTO metrics (device_id, latency, ...) VALUES ...
  │
  ├─ 9. Evaluate alerts (parallel)
  │     For each device:
  │       - Check if latency > threshold → create/update alert
  │       - Check if packet loss > threshold → create/update alert
  │       - Check if bandwidth > threshold → create/update alert
  │       - Auto-resolve alerts if conditions cleared
  │
  └─ 10. Broadcast via Socket.IO
        emit('metrics:cycle', results)
        emit('alert:new', newAlert)
```

**Key Functions Explained:**

##### `startScheduler()`
```typescript
export function startScheduler(): void {
  const interval = env.pollIntervalSeconds; // Default: 30
  const cronExpression = `*/${interval} * * * * *`; // Every 30 seconds
  
  cronTask = cron.schedule(cronExpression, () => {
    void runMonitoringCycle(); // Fire async cycle
  });
  
  void runMonitoringCycle(); // Run immediately on startup
}
```
- Uses node-cron for scheduling
- Supports custom intervals (5s to 1 hour)
- Fires immediately on boot (don't wait 30s)

##### `runMonitoringCycle()`
```typescript
export async function runMonitoringCycle(): Promise<void> {
  // Prevent overlapping cycles
  if (cycleRunning) {
    logger.warn("Previous cycle still running, skipping");
    return;
  }
  
  cycleRunning = true;
  
  try {
    // 1. Fetch devices and settings in parallel
    const [devices, settings] = await Promise.all([
      deviceRepository.findAll(),
      settingsRepository.get()
    ]);
    
    // 2. Partition by network
    const byNetwork = new Map<number, Device[]>();
    for (const device of devices) {
      const list = byNetwork.get(device.network_id) ?? [];
      list.push(device);
      byNetwork.set(device.network_id, list);
    }
    
    // 3. Spawn workers (one per network)
    const results = await Promise.allSettled(
      [...byNetwork.entries()].map(([netId, devs]) => {
        return runWorker(devs); // Returns Promise<ProbeResult[]>
      })
    );
    
    // 4. Handle worker failures gracefully
    const allResults = results.flatMap(r => 
      r.status === 'fulfilled' ? r.value : []
    );
    
    // 5. Convert raw results to PollResult (with bandwidth calc)
    const pollResults = allResults.map(r => 
      toPollResult(r, settings)
    );
    
    // 6. Store metrics and evaluate alerts (parallel)
    await Promise.all([
      metricRepository.insertBatch(pollResults),
      evaluateAlerts(pollResults, settings)
    ]);
    
    // 7. Broadcast to clients
    emitMonitoringEvents(pollResults);
    
  } finally {
    cycleRunning = false; // Always release lock
  }
}
```

**Why Promise.allSettled instead of Promise.all?**
- Promise.all fails if ANY worker fails (kills entire cycle)
- Promise.allSettled waits for ALL workers, even if some fail
- Failed workers return empty results instead of crashing

##### `runWorker()`
```typescript
function runWorker(devices: Device[]): Promise<ProbeResult[]> {
  return new Promise((resolve, reject) => {
    // Spawn worker thread
    const worker = new Worker('./poll.worker.js', {
      workerData: {
        devices: devices.map(d => ({ id: d.id, ip: d.ip_address })),
        icmpPacketCount: 4,
        icmpTimeoutSeconds: 2,
        snmpCommunity: 'public',
        snmpPort: 161
      }
    });
    
    // Set timeout (28 seconds for 500 devices = 50ms per device)
    const timeout = setTimeout(() => {
      worker.terminate(); // Kill worker
      resolve([]); // Return empty instead of failing
    }, 28000);
    
    // Handle worker completion
    worker.once('message', (results: ProbeResult[]) => {
      clearTimeout(timeout);
      resolve(results);
      worker.terminate(); // Clean up
    });
    
    // Handle worker errors
    worker.once('error', (err) => {
      clearTimeout(timeout);
      logger.error('Worker error:', err);
      resolve([]); // Return empty instead of failing
    });
  });
}
```

**Why Worker Threads?**
- ICMP and SNMP are blocking operations
- Running 500 devices sequentially = 500 × 5s = 42 minutes! ❌
- Worker threads enable true parallelism (not just async)
- One worker per network = 5 parallel groups
- Result: 500 devices in 15-25 seconds ✅

##### `toPollResult()` - Bandwidth Calculation
```typescript
function toPollResult(raw: RawProbeResult, settings: Settings): PollResult {
  // Get previous SNMP counter values
  const prev = lastCounters.get(raw.deviceId);
  
  // Calculate time delta
  const now = Date.now();
  const intervalSec = prev ? (now - prev.at) / 1000 : 30;
  
  // Calculate bandwidth (Mbps)
  const bwIn = octetsToMbps(
    prev?.inOctets ?? null,   // Previous value
    raw.snmpInOctets,          // Current value
    intervalSec                // Time delta
  );
  
  // Handle 32-bit counter wraparound
  // SNMP counters reset at 2^32, need to detect and handle
  
  // Store current values for next cycle
  lastCounters.set(raw.deviceId, {
    inOctets: raw.snmpInOctets,
    outOctets: raw.snmpOutOctets,
    at: now
  });
  
  // Determine status
  let status: DeviceStatus = 'down';
  if (raw.alive) {
    const isDegraded = 
      (raw.latency > settings.latency_warn_ms) ||
      (raw.packetLoss > settings.packet_loss_warn_pct);
    status = isDegraded ? 'degraded' : 'up';
  }
  
  return {
    deviceId: raw.deviceId,
    status,
    latencyMs: raw.latency,
    packetLoss: raw.packetLoss,
    bandwidthInMbps: bwIn,
    bandwidthOutMbps: bwOut
  };
}
```

**Why Store Previous Counters?**
- SNMP returns cumulative counters (total bytes since device boot)
- To get current bandwidth, we need: (current - previous) / time_delta
- Example:
  - Cycle 1: inOctets = 1,000,000 (store)
  - Cycle 2: inOctets = 2,500,000
  - Delta = 2,500,000 - 1,000,000 = 1,500,000 bytes in 30 seconds
  - Bandwidth = (1,500,000 × 8) / 30 / 1,000,000 = 0.4 Mbps

##### `evaluateAlerts()`
```typescript
async function evaluateAlerts(results: PollResult[], settings: Settings) {
  const operations: Promise<void>[] = [];
  
  for (const result of results) {
    const clearedAlerts: string[] = [];
    
    // Check device_down
    if (result.status === 'down') {
      operations.push(
        upsertAlert(result, 'critical', 'device_down', 
          'Device unreachable')
      );
    } else {
      clearedAlerts.push('device_down');
    }
    
    // Check high_latency
    if (result.latency > settings.latency_crit_ms) {
      operations.push(
        upsertAlert(result, 'critical', 'high_latency',
          `Latency ${result.latency}ms > ${settings.latency_crit_ms}ms`)
      );
    } else if (result.latency > settings.latency_warn_ms) {
      operations.push(
        upsertAlert(result, 'warning', 'high_latency',
          `Latency ${result.latency}ms > ${settings.latency_warn_ms}ms`)
      );
    } else {
      clearedAlerts.push('high_latency');
    }
    
    // Auto-resolve cleared alerts
    if (clearedAlerts.length > 0) {
      operations.push(
        alertRepository.autoResolveCleared(result.deviceId, clearedAlerts)
      );
    }
  }
  
  // Execute all alert operations in parallel
  await Promise.allSettled(operations);
}
```

**Alert Deduplication:**
- One active alert per device + type combination
- If alert already exists, update message/severity (don't create duplicate)
- Auto-resolve when condition clears
- Example: Device down → create alert → device up → resolve alert

---

#### 2. Poll Worker (`monitoring/poll.worker.ts`)

**Purpose**: Runs in a separate thread to poll devices without blocking main thread.

**What it does:**
```typescript
// This runs in a SEPARATE THREAD (not the main event loop)
const { workerData, parentPort } = require('worker_threads');

async function pollDevices() {
  const results: ProbeResult[] = [];
  
  // Poll all devices in THIS batch (e.g., all Network-1 devices)
  for (const device of workerData.devices) {
    try {
      // 1. ICMP Probe (ping)
      const icmpResult = await icmpProbe(device.ip, {
        count: workerData.icmpPacketCount,     // Send 4 packets
        timeout: workerData.icmpTimeoutSeconds  // 2 second timeout
      });
      
      // 2. SNMP Probe (bandwidth counters)
      let snmpResult = { inOctets: null, outOctets: null };
      if (icmpResult.alive) {
        // Only query SNMP if device is reachable
        snmpResult = await snmpProbe(device.ip, {
          community: workerData.snmpCommunity,
          port: workerData.snmpPort,
          timeout: workerData.snmpTimeoutMs
        });
      }
      
      results.push({
        deviceId: device.id,
        networkId: device.networkId,
        alive: icmpResult.alive,
        latencyMs: icmpResult.latency,
        packetLossPct: icmpResult.loss,
        snmpInOctets: snmpResult.inOctets,
        snmpOutOctets: snmpResult.outOctets
      });
      
    } catch (err) {
      // Individual device failure shouldn't crash worker
      results.push({
        deviceId: device.id,
        networkId: device.networkId,
        alive: false,
        latencyMs: null,
        packetLossPct: 100,
        snmpInOctets: null,
        snmpOutOctets: null
      });
    }
  }
  
  // Send results back to main thread
  parentPort.postMessage(results);
}

pollDevices().catch(err => {
  console.error('Worker failed:', err);
  process.exit(1);
});
```

**Why Separate File?**
- Worker threads require a separate entry point
- Can't use inline functions
- Must be a .js file (compiled from TypeScript)

**Error Handling:**
- Try-catch per device (one failure doesn't kill batch)
- Uncaught exception handlers (worker crashes gracefully)
- Timeout in main thread (kills runaway workers)

---

#### 3. ICMP Probe (`monitoring/icmp.ts`)

**Purpose**: Ping devices to check reachability and measure latency.

```typescript
import ping from 'ping'; // Wraps system ping command

export async function icmpProbe(
  host: string,
  options: { count: number; timeout: number }
): Promise<{ alive: boolean; latency: number | null; loss: number }> {
  try {
    // Run system ping command
    // Linux: ping -c 4 -W 2 192.168.1.1
    // Windows: ping -n 4 -w 2000 192.168.1.1
    const result = await ping.promise.probe(host, {
      timeout: options.timeout,
      min_reply: options.count
    });
    
    // Parse results
    return {
      alive: result.alive,            // Did any packets succeed?
      latency: result.avg || null,    // Average latency in ms
      loss: parseFloat(result.packetLoss) || 0  // % packets lost
    };
    
  } catch (err) {
    // Network error, host unreachable, etc.
    return {
      alive: false,
      latency: null,
      loss: 100
    };
  }
}
```

**What is ICMP?**
- Internet Control Message Protocol
- Used by the `ping` command
- Sends echo request, waits for echo reply
- Measures round-trip time (latency)
- Not all devices respond to ping (firewall may block)

**Why 4 Packets?**
- Single packet can be lost due to random network issues
- Average of 4 gives more reliable measurement
- Industry standard (ping default)

---

#### 4. SNMP Probe (`monitoring/snmp.ts`)

**Purpose**: Query devices for bandwidth usage via SNMP.

```typescript
import snmp from 'net-snmp';

export async function snmpProbe(
  host: string,
  options: { community: string; port: number; timeout: number }
): Promise<{ inOctets: number | null; outOctets: number | null }> {
  // Create SNMP session
  const session = snmp.createSession(host, options.community, {
    port: options.port,
    timeout: options.timeout,
    version: snmp.Version2c
  });
  
  try {
    // Query two OIDs (Object Identifiers)
    // 1.3.6.1.2.1.2.2.1.10.1 = ifInOctets (bytes received on interface 1)
    // 1.3.6.1.2.1.2.2.1.16.1 = ifOutOctets (bytes sent on interface 1)
    const oids = [
      '1.3.6.1.2.1.2.2.1.10.1',  // inOctets
      '1.3.6.1.2.1.2.2.1.16.1'   // outOctets
    ];
    
    const values = await new Promise<number[]>((resolve, reject) => {
      session.get(oids, (err, varbinds) => {
        if (err) return reject(err);
        
        const results = varbinds.map(vb => {
          if (snmp.isVarbindError(vb)) return null;
          return parseInt(vb.value.toString(), 10);
        });
        
        resolve(results);
      });
    });
    
    return {
      inOctets: values[0],
      outOctets: values[1]
    };
    
  } catch (err) {
    // Device doesn't support SNMP, wrong community string, etc.
    return {
      inOctets: null,
      outOctets: null
    };
    
  } finally {
    // CRITICAL: Close session to prevent memory leaks
    session.close();
  }
}
```

**What is SNMP?**
- Simple Network Management Protocol
- Industry standard for monitoring network devices
- Devices expose management information via OIDs
- Like a database query for network stats

**Key Concepts:**

1. **Community String**: Like a password
   - Default is "public" (read-only)
   - Many devices use this out-of-the-box

2. **OID (Object Identifier)**: Path to specific metric
   - 1.3.6.1.2.1.2.2.1.10.1 = ifInOctets (IF-MIB standard)
   - Standardized by IETF (all vendors use same OIDs)

3. **Counter Wraparound**: 32-bit counters reset at 4,294,967,296
   - Must detect and handle in bandwidth calculation
   - Example: prev=4,294,967,000, curr=100 → wrapped, add 2^32

**Bandwidth Calculation:**
```typescript
export function octetsToMbps(
  prev: number | null,
  curr: number | null,
  intervalSec: number
): number {
  if (prev === null || curr === null) return 0;
  
  let delta = curr - prev;
  
  // Handle 32-bit counter wraparound
  if (delta < 0) {
    delta += 4_294_967_296; // 2^32
  }
  
  // Convert octets to bits, then to Mbps
  // delta octets × 8 bits/octet ÷ intervalSec ÷ 1_000_000 = Mbps
  return (delta * 8) / intervalSec / 1_000_000;
}
```

---

## Database Layer

### Connection Pool (`config/db.ts`)

**Purpose**: Manage PostgreSQL connections efficiently.

```typescript
import { Pool } from 'pg';

// Create connection pool
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,              // Maximum 20 connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 5000,  // Wait max 5s for available connection
  keepAlive: true,      // Send TCP keep-alive packets
  keepAliveInitialDelayMillis: 10000
});
```

**Why Connection Pooling?**
- Creating new DB connection is expensive (100-200ms)
- Pool maintains ready-to-use connections
- Reuses connections across requests
- Much faster: 1-2ms to get connection from pool

**Pool Events:**
```typescript
pool.on('connect', (client) => {
  logger.debug('New client connected to pool');
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool');
});

pool.on('remove', (client) => {
  logger.debug('Client removed from pool');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client:', err);
});
```

**Pool Monitoring:**
```typescript
export function startPoolMonitoring() {
  setInterval(() => {
    const stats = {
      total: pool.totalCount,       // Total connections
      idle: pool.idleCount,         // Available connections
      waiting: pool.waitingCount    // Requests waiting for connection
    };
    
    logger.info('Pool stats:', stats);
    
    // Alert if pool is exhausted
    if (stats.waiting > 5) {
      logger.warn('Pool exhaustion detected!');
    }
  }, 60000); // Every minute
}
```

**Query Helper:**
```typescript
export async function query(
  sql: string,
  params?: any[]
): Promise<QueryResult> {
  const start = Date.now();
  
  try {
    const result = await pool.query(sql, params);
    const duration = Date.now() - start;
    
    logger.debug(`Query executed in ${duration}ms: ${sql}`);
    
    return result;
    
  } catch (err) {
    logger.error('Query failed:', sql, err);
    throw err;
  }
}
```

**Transaction Helper:**
```typescript
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
    
  } finally {
    client.release(); // Return connection to pool
  }
}
```

---

### Repository Pattern

**Purpose**: Separate database queries from business logic.

**Structure:**
```
routes/api.ts (HTTP handlers)
    ↓
services/*.service.ts (business logic)
    ↓
repositories/*.repository.ts (database queries)
    ↓
config/db.ts (connection pool)
```

**Example: Device Repository**

```typescript
// repositories/device.repository.ts

class DeviceRepository {
  /**
   * Find all devices with their network information
   */
  async findAll(): Promise<Device[]> {
    const result = await query(`
      SELECT 
        d.*,
        n.name as network_name,
        array_agg(l.name) as links
      FROM devices d
      JOIN networks n ON d.network_id = n.id
      LEFT JOIN device_links dl ON d.id = dl.device_id
      LEFT JOIN links l ON dl.link_id = l.id
      GROUP BY d.id, n.name
      ORDER BY d.name
    `);
    
    return result.rows;
  }
  
  /**
   * Find device by ID
   */
  async findById(id: string): Promise<Device | null> {
    const result = await query(
      'SELECT * FROM devices WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }
  
  /**
   * Create new device
   */
  async create(device: NewDevice): Promise<string> {
    const result = await query(`
      INSERT INTO devices (ip_address, name, network_id, username)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [device.ip, device.name, device.networkId, device.username]);
    
    return result.rows[0].id;
  }
  
  /**
   * Update device
   */
  async update(id: string, updates: Partial<Device>): Promise<void> {
    await query(`
      UPDATE devices
      SET 
        name = COALESCE($2, name),
        ip_address = COALESCE($3, ip_address)
      WHERE id = $1
    `, [id, updates.name, updates.ip]);
  }
}

export const deviceRepository = new DeviceRepository();
```

**Benefits:**
- Single responsibility: Repository only does database queries
- Testable: Can mock repository in service tests
- Reusable: Multiple services can use same repository
- Maintainable: Database changes isolated to one file

---

This is a comprehensive start. Would you like me to continue with:
1. API Routes explanation
2. Frontend architecture
3. Socket.IO implementation
4. Authentication flow
5. Upload pipeline
6. Something specific you want to understand better?

Let me know what section you'd like me to expand next!
