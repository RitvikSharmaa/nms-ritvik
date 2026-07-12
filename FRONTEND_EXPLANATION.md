# Frontend Code Explanation

## Table of Contents
1. [Frontend Architecture](#frontend-architecture)
2. [Simulation Engine](#simulation-engine)
3. [React Router Structure](#react-router-structure)
4. [Component Library](#component-library)
5. [State Management](#state-management)
6. [Key Features](#key-features)

---

## Frontend Architecture

### Technology Stack
```
┌─────────────────────────────────────────────────────┐
│ React 19 + TypeScript                               │
│ ├─ TanStack Router (file-based routing + SSR)      │
│ ├─ TanStack Query (server state management)        │
│ ├─ Tailwind CSS + Shadcn UI (styling)              │
│ ├─ Recharts (data visualization)                   │
│ ├─ Framer Motion (animations)                      │
│ └─ React Hook Form + Zod (form handling)           │
└─────────────────────────────────────────────────────┘
```

### Two Modes of Operation

#### Mode 1: Standalone (Simulation Engine)
```
User → Browser → Simulation Engine → UI Update
         ↓
    No Backend Needed!
```
- Runs entirely in browser
- 56 simulated devices across 5 networks
- Updates every 30 seconds
- Perfect for demos, development, offline use

#### Mode 2: Production (Real Backend)
```
User → Browser → API Calls → Backend → PostgreSQL
         ↑           ↓
         └─ Socket.IO (real-time updates)
```
- Connects to Express API
- Real ICMP/SNMP monitoring
- WebSocket for live updates
- Production deployment mode

---

## Simulation Engine

### Location
`src/lib/nms/engine.ts` - The complete simulation engine (no backend required!)

### What It Does
Simulates a complete network monitoring system in the browser:
- **56 devices** across 5 networks
- **240 data points** of historical metrics per device
- **Real-time updates** every 30 seconds
- **Alert generation** based on thresholds
- **PRNG-based** (pseudo-random number generator) for consistent behavior

### Architecture

```typescript
/**
 * ENGINE STATE
 */
interface EngineState {
  devices: Device[];              // 56 simulated devices
  metrics: Map<deviceId, Metric[]>;  // Historical metrics (240 points each)
  alerts: Alert[];                // Active alerts (max 500)
  settings: Settings;             // Thresholds and configuration
  users: User[];                  // Demo users
  auditLogs: AuditLog[];          // Activity history
}
```

### Initialization Flow

```typescript
// 1. Create 56 devices (distributed across 5 networks)
function generateDevices(): Device[] {
  const devices: Device[] = [];
  
  // Network-1: 12 devices
  // Network-2: 11 devices
  // Network-3: 11 devices
  // Network-4: 11 devices
  // Network-5: 11 devices
  
  for (let i = 0; i < 56; i++) {
    const networkId = (i % 5) + 1;  // Distribute evenly
    const deviceNum = Math.floor(i / 5) + 1;
    
    devices.push({
      id: generateUUID(),
      name: `Device-${networkId}-${deviceNum}`,
      ip_address: `192.168.${networkId}.${deviceNum}`,
      network_id: networkId,
      network_name: `Network-${networkId}`,
      links: assignLinks(),  // Random link assignment
      username: 'admin',
      created_at: new Date().toISOString()
    });
  }
  
  return devices;
}

// 2. Generate 240 historical data points per device (30 seconds × 240 = 2 hours)
function generateHistoricalMetrics(device: Device): Metric[] {
  const metrics: Metric[] = [];
  const now = Date.now();
  
  for (let i = 239; i >= 0; i--) {
    const timestamp = new Date(now - i * 30_000);  // 30 seconds ago
    
    metrics.push({
      device_id: device.id,
      polled_at: timestamp.toISOString(),
      status: simulateStatus(),           // up, degraded, or down
      latency_ms: simulateLatency(),      // 10-200ms
      packet_loss_pct: simulatePacketLoss(),  // 0-15%
      bandwidth_in_mbps: simulateBandwidth(),  // 0-100 Mbps
      bandwidth_out_mbps: simulateBandwidth(), // 0-100 Mbps
      health_score: calculateHealthScore()  // 0-100
    });
  }
  
  return metrics;
}
```

### Simulation Update Cycle (Every 30 Seconds)

```typescript
/**
 * Main simulation loop - runs every 30 seconds
 */
function runSimulationCycle() {
  // 1. Generate new metrics for all devices
  for (const device of state.devices) {
    const newMetric = generateMetric(device);
    
    // Add to history
    const deviceMetrics = state.metrics.get(device.id) || [];
    deviceMetrics.push(newMetric);
    
    // Keep only last 240 points (2 hours)
    if (deviceMetrics.length > 240) {
      deviceMetrics.shift();  // Remove oldest
    }
    
    state.metrics.set(device.id, deviceMetrics);
  }
  
  // 2. Evaluate alert conditions
  evaluateAlerts();
  
  // 3. Notify subscribers (React components re-render)
  notifySubscribers();
}

/**
 * Generate realistic metric for a device
 */
function generateMetric(device: Device): Metric {
  // Use PRNG (pseudo-random number generator) for consistency
  const rng = mulberry32(seedFromDeviceId(device.id));
  
  // Base status (80% up, 15% degraded, 5% down)
  const rand = rng();
  let status: DeviceStatus;
  if (rand < 0.05) status = 'down';
  else if (rand < 0.20) status = 'degraded';
  else status = 'up';
  
  // Latency (realistic distribution)
  const latency = status === 'down' 
    ? null 
    : Math.floor(10 + rng() * 190);  // 10-200ms
  
  // Packet loss (correlated with status)
  const packetLoss = status === 'down'
    ? 100
    : status === 'degraded'
      ? Math.floor(5 + rng() * 10)   // 5-15%
      : Math.floor(rng() * 2);        // 0-2%
  
  // Bandwidth (varies over time, simulates traffic patterns)
  const hour = new Date().getHours();
  const isBusinessHours = hour >= 8 && hour <= 18;
  const baseLoad = isBusinessHours ? 50 : 20;  // Higher during day
  
  const bandwidthIn = status === 'down'
    ? 0
    : baseLoad + Math.floor(rng() * 30);  // +/- 30 Mbps variance
    
  const bandwidthOut = status === 'down'
    ? 0
    : baseLoad + Math.floor(rng() * 30);
  
  return {
    device_id: device.id,
    polled_at: new Date().toISOString(),
    status,
    latency_ms: latency,
    packet_loss_pct: packetLoss,
    bandwidth_in_mbps: bandwidthIn,
    bandwidth_out_mbps: bandwidthOut,
    health_score: calculateHealthScore(latency, packetLoss, status)
  };
}

/**
 * Calculate health score (0-100)
 */
function calculateHealthScore(
  latency: number | null,
  packetLoss: number,
  status: DeviceStatus
): number {
  if (status === 'down') return 0;
  
  let score = 100;
  
  // Deduct for latency
  if (latency !== null) {
    if (latency > 100) score -= 20;
    else if (latency > 50) score -= 10;
  }
  
  // Deduct for packet loss
  if (packetLoss > 5) score -= 30;
  else if (packetLoss > 2) score -= 15;
  
  return Math.max(0, score);
}
```

### Alert Evaluation

```typescript
/**
 * Evaluate alert conditions for all devices
 */
function evaluateAlerts() {
  const settings = state.settings;
  
  for (const device of state.devices) {
    const latestMetric = getLatestMetric(device.id);
    if (!latestMetric) continue;
    
    // Clear existing alerts for this device
    const existingAlerts = state.alerts.filter(a => 
      a.device_id === device.id
    );
    
    // Check device_down
    if (latestMetric.status === 'down') {
      upsertAlert(device, 'critical', 'device_down', 
        'Device unreachable - ICMP timeout');
    } else {
      resolveAlert(device.id, 'device_down');
    }
    
    // Check high_latency
    if (latestMetric.latency_ms !== null) {
      if (latestMetric.latency_ms > settings.latency_crit_ms) {
        upsertAlert(device, 'critical', 'high_latency',
          `Latency ${latestMetric.latency_ms}ms > ${settings.latency_crit_ms}ms`);
      } else if (latestMetric.latency_ms > settings.latency_warn_ms) {
        upsertAlert(device, 'warning', 'high_latency',
          `Latency ${latestMetric.latency_ms}ms > ${settings.latency_warn_ms}ms`);
      } else {
        resolveAlert(device.id, 'high_latency');
      }
    }
    
    // Check packet_loss
    if (latestMetric.packet_loss_pct > settings.packet_loss_crit_pct) {
      upsertAlert(device, 'critical', 'packet_loss',
        `Packet loss ${latestMetric.packet_loss_pct}% > ${settings.packet_loss_crit_pct}%`);
    } else if (latestMetric.packet_loss_pct > settings.packet_loss_warn_pct) {
      upsertAlert(device, 'warning', 'packet_loss',
        `Packet loss ${latestMetric.packet_loss_pct}% > ${settings.packet_loss_warn_pct}%`);
    } else {
      resolveAlert(device.id, 'packet_loss');
    }
    
    // Check bandwidth
    const maxBw = Math.max(latestMetric.bandwidth_in_mbps, latestMetric.bandwidth_out_mbps);
    if (maxBw > settings.bandwidth_warn_mbps) {
      upsertAlert(device, 'warning', 'bandwidth_utilization',
        `Bandwidth ${maxBw}Mbps > ${settings.bandwidth_warn_mbps}Mbps`);
    } else {
      resolveAlert(device.id, 'bandwidth_utilization');
    }
  }
  
  // Limit total alerts to 500 (keep most recent)
  if (state.alerts.length > 500) {
    state.alerts = state.alerts.slice(-500);
  }
}
```

### PRNG (Pseudo-Random Number Generator)

```typescript
/**
 * Mulberry32 PRNG - Fast, deterministic random number generator
 * 
 * Why use this instead of Math.random()?
 * - Math.random() is non-deterministic (different each time)
 * - PRNG with seed produces consistent results
 * - Useful for demos (same seed = same behavior)
 * - Fast (much faster than crypto.random())
 * 
 * How it works:
 * - Takes a seed (number)
 * - Returns a function that generates numbers 0-1
 * - Same seed always produces same sequence
 * 
 * Example:
 *   const rng1 = mulberry32(12345);
 *   rng1(); // 0.239847
 *   rng1(); // 0.847234
 *   
 *   const rng2 = mulberry32(12345);  // Same seed
 *   rng2(); // 0.239847  // Same first value!
 *   rng2(); // 0.847234  // Same second value!
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Generate seed from device ID for consistent per-device behavior
 */
function seedFromDeviceId(deviceId: string): number {
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = ((hash << 5) - hash) + deviceId.charCodeAt(i);
    hash = hash & hash;  // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

### Subscription Pattern (Observer Pattern)

```typescript
/**
 * Subscribers (React components) that want updates
 */
const subscribers: Set<() => void> = new Set();

/**
 * Subscribe to engine updates
 * 
 * Called by React hook useNms() when component mounts.
 * Returns unsubscribe function for cleanup.
 */
export function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  
  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Notify all subscribers of state change
 * 
 * Called after simulation cycle completes.
 * Causes all subscribed React components to re-render.
 */
function notifySubscribers() {
  for (const callback of subscribers) {
    callback();  // Triggers React re-render
  }
}
```

### React Integration

```typescript
// src/lib/nms/useNms.ts

/**
 * React hook for accessing simulation engine
 * 
 * Usage in components:
 *   const { devices, alerts, metrics } = useNms();
 */
export function useNms() {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    // Subscribe to engine updates
    const unsubscribe = subscribe(() => {
      forceUpdate({}); // Force component re-render
    });
    
    // Cleanup on unmount
    return unsubscribe;
  }, []);
  
  // Return current engine state
  return {
    devices: getDevices(),
    alerts: getAlerts(),
    metrics: getMetrics(),
    settings: getSettings(),
    // ... other getters
  };
}
```

---

## React Router Structure

### File-Based Routing
TanStack Router uses file structure to define routes automatically.

```
src/routes/
├── __root.tsx              → / (root layout)
├── index.tsx               → / (dashboard)
├── networks.$networkId.tsx → /networks/1, /networks/2, etc.
├── upload.tsx              → /upload
├── alerts.tsx              → /alerts
├── reports.tsx             → /reports
├── comparison.tsx          → /comparison
├── settings.tsx            → /settings
├── users.tsx               → /users
└── audit-logs.tsx          → /audit-logs
```

### Root Layout (`__root.tsx`)

```typescript
/**
 * Root layout wraps all pages
 * Provides AppShell (sidebar + header)
 */
export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AppShell>
      {/* Outlet renders child routes */}
      <Outlet />
    </AppShell>
  );
}
```

### Dashboard Page (`index.tsx`)

```typescript
/**
 * Dashboard - Global network overview
 * 
 * Shows:
 * - Total devices, alerts, health score
 * - Per-network status summary
 * - Alert distribution chart
 * - Top problem devices
 * - Historical trend chart
 */
export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const { devices, alerts, metrics } = useNms();
  
  // Calculate KPIs
  const totalDevices = devices.length;
  const upDevices = devices.filter(d => d.status === 'up').length;
  const downDevices = devices.filter(d => d.status === 'down').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  
  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard 
          title="Total Devices" 
          value={totalDevices}
          icon={<Server />}
        />
        <KpiCard 
          title="Online" 
          value={upDevices}
          trend="+5%"
          status="success"
        />
        <KpiCard 
          title="Offline" 
          value={downDevices}
          status="error"
        />
        <KpiCard 
          title="Critical Alerts" 
          value={criticalAlerts}
          status="warning"
        />
      </div>
      
      {/* Network Grid */}
      <div className="grid grid-cols-5 gap-4">
        {[1,2,3,4,5].map(netId => (
          <NetworkCard 
            key={netId}
            networkId={netId}
            devices={devices.filter(d => d.network_id === netId)}
          />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <AlertDistributionChart alerts={alerts} />
        <NetworkTrendChart metrics={metrics} />
      </div>
      
      {/* Top Problems */}
      <TopProblemsTable devices={devices} alerts={alerts} />
    </div>
  );
}
```

### Network Detail Page (`networks.$networkId.tsx`)

```typescript
/**
 * Network detail page with dynamic ID
 * 
 * Route: /networks/1, /networks/2, etc.
 * $networkId is a path parameter
 */
export const Route = createFileRoute('/networks/$networkId')({
  component: NetworkDetail,
});

function NetworkDetail() {
  // Get network ID from URL
  const { networkId } = Route.useParams();
  const networkIdNum = parseInt(networkId, 10);
  
  const { devices, metrics, alerts } = useNms();
  
  // Filter data for this network
  const networkDevices = devices.filter(d => d.network_id === networkIdNum);
  const networkAlerts = alerts.filter(a => a.network_id === networkIdNum);
  
  return (
    <div className="p-6 space-y-6">
      <h1>Network-{networkId}</h1>
      
      {/* Network-specific KPIs */}
      <KpiRow devices={networkDevices} />
      
      {/* Device Table */}
      <DeviceTable devices={networkDevices} />
      
      {/* Link Health */}
      <LinkHealthGrid networkId={networkIdNum} />
      
      {/* Network Trend Chart */}
      <TrendChart metrics={metrics} networkId={networkIdNum} />
    </div>
  );
}
```

---

## Component Library

### Shadcn UI Components
Pre-built, accessible components based on Radix UI primitives.

Located in: `src/components/ui/`

```typescript
// Example: Button component
import { Button } from '@/components/ui/button';

<Button variant="default">Click Me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Close</Button>
```

### Custom NMS Components
Business logic components specific to this app.

Located in: `src/components/nms/`

```typescript
/**
 * KpiCard - Displays a key metric with optional trend
 */
export function KpiCard({
  title,
  value,
  icon,
  trend,
  status
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground">
            {trend} from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

This frontend explanation is comprehensive but I've created it as a separate document. Would you like me to:

1. Continue adding more inline comments to specific files?
2. Create additional documentation for specific topics?
3. Explain a particular component or pattern in more detail?
4. Add comments to the database migrations or SQL files?

Let me know which area you'd like me to focus on next!
