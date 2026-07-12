# Metrics Quick Reference Guide

## YES - All Charts Display Real Data! ✅

Quick reference for understanding what data each chart displays and where it comes from.

---

## Data Collection (Every 30 Seconds)

| Metric | Protocol | Source | Value Range | Storage |
|--------|----------|--------|-------------|---------|
| **Latency** | ICMP | Ping RTT | 1-50ms (typical) | `device_metrics.latency` |
| **Packet Loss** | ICMP | Ping statistics | 0-5% (typical) | `device_metrics.packet_loss` |
| **Bandwidth In** | SNMP | OID 1.3.6.1.2.1.2.2.1.10 | 10-500 Mbps | `device_metrics.bandwidth_in` |
| **Bandwidth Out** | SNMP | OID 1.3.6.1.2.1.2.2.1.16 | 10-500 Mbps | `device_metrics.bandwidth_out` |
| **Device Status** | ICMP | Ping reachability | up/degraded/down | `device_metrics.status` |

---

## Dashboard Page Charts

### **Latency Trend Chart**
- **Shows**: Average latency across all devices over last 40 minutes
- **Data Source**: `engine.trendSeries(undefined, 80)`
- **Updates**: Every 30 seconds
- **Y-Axis**: Milliseconds (ms)
- **X-Axis**: Time (HH:MM format)
- **Real Data**: ✅ ICMP ping RTT

### **Bandwidth Trend Chart**
- **Shows**: Total inbound/outbound bandwidth across all devices
- **Data Source**: `engine.trendSeries(undefined, 80)`
- **Updates**: Every 30 seconds
- **Y-Axis**: Megabits per second (Mbps)
- **X-Axis**: Time (HH:MM format)
- **Lines**: Blue (inbound), Purple (outbound)
- **Real Data**: ✅ SNMP interface statistics

### **Packet Loss Trend Chart**
- **Shows**: Average packet loss across all devices
- **Data Source**: `engine.trendSeries(undefined, 80)`
- **Updates**: Every 30 seconds
- **Y-Axis**: Percentage (%)
- **X-Axis**: Time (HH:MM format)
- **Real Data**: ✅ ICMP ping loss

---

## Network Detail Page Charts

### **Network Latency Trend**
- **Shows**: Average latency for devices in selected network
- **Data Source**: `engine.trendSeries(networkId, 80)`
- **Updates**: Every 30 seconds
- **Filtered By**: `networkId` (Network-1 through Network-5)
- **Real Data**: ✅ ICMP ping RTT for network devices only

### **Network Bandwidth Trend**
- **Shows**: Total bandwidth for devices in selected network
- **Data Source**: `engine.trendSeries(networkId, 80)`
- **Updates**: Every 30 seconds
- **Filtered By**: `networkId`
- **Real Data**: ✅ SNMP bandwidth for network devices only

---

## Comparison Page Charts

### **Performance Radar Chart**
- **Shows**: Normalized metrics (0-100) for all 5 networks
- **Metrics**: Latency, Packet Loss, Uptime, Bandwidth, Availability
- **Data Source**: `engine.networkSummary(network)` for each network
- **Updates**: Every 30 seconds
- **Real Data**: ✅ All real metrics normalized to 0-100 scale

### **Latency Bar Chart**
- **Shows**: Average latency per network (side-by-side bars)
- **Data Source**: `engine.networkSummary(network).avgLatency`
- **Updates**: Every 30 seconds
- **Real Data**: ✅ ICMP ping RTT per network

### **Bandwidth Bar Chart**
- **Shows**: Total bandwidth per network (side-by-side bars)
- **Data Source**: `engine.networkSummary(network).totalBandwidth`
- **Updates**: Every 30 seconds
- **Real Data**: ✅ SNMP bandwidth sum per network

### **Metric Heatmap**
- **Shows**: Color-coded table of all metrics for all networks
- **Data Source**: `engine.networkSummary(network)` for each network
- **Metrics**: Latency, Packet Loss, Uptime, Bandwidth, Health
- **Color Coding**: Red (bad) → Yellow (warning) → Green (good)
- **Real Data**: ✅ All metrics from monitoring engine

### **Network Ranking Table**
- **Shows**: Networks sorted by health score
- **Data Source**: `engine.networkSummary(network).healthScore`
- **Columns**: Health, Devices, Online, Latency, Loss, Uptime, Bandwidth
- **Real Data**: ✅ All columns show real metrics

---

## KPI Cards (All Pages)

### **Dashboard KPIs** (`engine.globalSummary()`)

| Card | Formula | Real Data Source |
|------|---------|------------------|
| **Total Devices** | `devices.size` | Count of uploaded devices |
| **Online** | `count(status === "up")` | ICMP reachability |
| **Offline** | `count(status === "down")` | ICMP unreachable |
| **Avg Latency** | `sum(latency) / deviceCount` | ICMP RTT average |
| **Avg Packet Loss** | `sum(packetLoss) / deviceCount` | ICMP loss average |
| **Avg Uptime** | `successfulPolls / totalPolls * 100` | Historical success rate |
| **Bandwidth** | `sum(bandwidthIn + bandwidthOut)` | SNMP interface totals |
| **Active Alerts** | `count(state !== "resolved")` | Alert state tracking |

### **Network Detail KPIs** (`engine.networkSummary(networkId)`)

Same calculations but **filtered to devices in specific network**.

---

## Data Aggregation Methods

### **`engine.trendSeries(network?, points)`**

**Purpose**: Generate time-series data for charts

**Input**:
- `network` (optional): Filter to specific network (e.g., "Network-1")
- `points` (default 60): Number of historical points to return

**Output**:
```typescript
Array<{
  t: number;             // Timestamp in milliseconds
  latency: number;       // Average latency (ms)
  packetLoss: number;    // Average packet loss (%)
  bandwidthIn: number;   // Total inbound bandwidth (Mbps)
  bandwidthOut: number;  // Total outbound bandwidth (Mbps)
}>
```

**Example**:
```javascript
const trend = engine.trendSeries("Network-1", 80);
// Returns last 80 polling cycles (40 minutes) for Network-1 devices
```

### **`engine.networkSummary(network)`**

**Purpose**: Calculate aggregate metrics for a network

**Input**:
- `network`: Network name ("Network-1" through "Network-5")

**Output**:
```typescript
{
  network: "Network-1",
  totalDevices: 25,        // Count of devices
  online: 23,              // Count with status "up"
  degraded: 1,             // Count with status "degraded"
  offline: 1,              // Count with status "down"
  avgLatency: 12.4,        // Average ICMP latency (ms)
  avgPacketLoss: 0.5,      // Average packet loss (%)
  avgUptime: 99.8,         // Average uptime (%)
  totalBandwidthIn: 5600,  // Sum of SNMP bandwidth in (Mbps)
  totalBandwidthOut: 3200, // Sum of SNMP bandwidth out (Mbps)
  activeAlerts: 2,         // Count of unresolved alerts
  healthScore: 94          // Computed 0-100 health score
}
```

### **`engine.globalSummary()`**

**Purpose**: Calculate aggregate metrics across all networks

**Output**: Same structure as `networkSummary()` but aggregated globally

---

## Health Score Calculation

```typescript
healthScore = 100 - penalties

Penalties:
- Latency > 50ms: -10 points
- Latency > 100ms: -20 points (replaces -10)
- Packet loss 1-5%: -15 points per percentage point
- Packet loss > 5%: -30 points per percentage point
- Uptime < 99%: -20 points
- Status "degraded": -10 points
- Status "down": -50 points

Minimum: 0
Maximum: 100
```

**Example**:
```
Device with:
- Latency: 120ms → -20 points
- Packet Loss: 2% → -30 points (2 × 15)
- Status: "degraded" → -10 points
- Uptime: 98% → -20 points
----------------------------------------
Health Score: 100 - 80 = 20/100
```

---

## Update Frequency

| Component | Update Trigger | Frequency |
|-----------|----------------|-----------|
| **Backend Polling** | Cron schedule | Every 30 seconds |
| **Database Write** | After each poll | Every 30 seconds |
| **Socket.IO Emit** | After database write | Every 30 seconds |
| **Frontend Engine Update** | Socket.IO event | Every 30 seconds |
| **React Component Re-render** | `useNms()` version increment | Every 30 seconds |
| **Chart Re-draw** | Component re-render | Every 30 seconds |

**Result**: Charts display data that is **at most 30 seconds old**.

---

## Device Status Rules

```typescript
if (ping fails or timeout) {
  status = "down";
} else if (latency > 200ms || packetLoss > 10%) {
  status = "degraded";
} else if (latency > 100ms || packetLoss > 5%) {
  status = "degraded";
} else {
  status = "up";
}
```

---

## Data Types (TypeScript)

### **MetricPoint**
```typescript
interface MetricPoint {
  t: number;                    // Timestamp (milliseconds since epoch)
  latency: number | null;       // RTT in milliseconds (null if unreachable)
  packetLoss: number;           // Percentage 0-100
  bandwidthIn: number;          // Mbps
  bandwidthOut: number;         // Mbps
  status: "up" | "degraded" | "down";
}
```

### **LiveMetrics**
```typescript
interface LiveMetrics {
  deviceId: string;
  status: "up" | "degraded" | "down";
  latency: number | null;       // Current latency
  packetLoss: number;           // Current packet loss
  bandwidthIn: number;          // Current inbound bandwidth
  bandwidthOut: number;         // Current outbound bandwidth
  uptimePct: number;            // Historical uptime percentage
  healthScore: number;          // Computed 0-100 score
  lastPoll: number;             // Timestamp of last successful poll
}
```

---

## Chart Component Props

### **TrendChart**
```typescript
<TrendChart 
  data={MetricPoint[]}          // Time-series data points
  series={[                      // Which metrics to display
    {
      key: "latency",            // MetricPoint property name
      label: "Latency",          // Display name in tooltip
      color: "var(--chart-1)"    // CSS variable for color
    }
  ]}
  unit=" ms"                     // Unit suffix for tooltips
  height={220}                   // Chart height in pixels
/>
```

---

## Verify Data Flow

### **1. Check Backend is Polling**
```bash
# View server logs
docker logs nms-server

# Look for:
[INFO] Monitoring cycle started for 25 devices
[INFO] Device 192.168.1.1: latency=12.4ms, loss=0.5%
```

### **2. Check Database has Data**
```sql
SELECT * FROM device_metrics 
ORDER BY timestamp DESC 
LIMIT 10;
```

### **3. Check Frontend Engine has Data**
```javascript
// Browser console
console.log(window.engine.history);
console.log(window.engine.trendSeries(undefined, 10));
```

### **4. Check Chart is Rendering**
```javascript
// Browser DevTools → Elements tab
// Look for <svg> with <path> elements
// Path coordinates correspond to data values
```

---

## Troubleshooting

### **Charts show flat lines (all zeros)**
- **Cause**: No devices polled yet
- **Fix**: Wait 30 seconds for first poll cycle

### **Charts show gaps**
- **Cause**: Devices unreachable during some polls
- **Expected**: Normal for occasional network issues

### **Charts don't update**
- **Cause**: Socket.IO connection lost
- **Fix**: Check browser console for WebSocket errors, reload page

### **Different networks show identical data**
- **Cause**: Bug in `trendSeries()` filtering
- **Fix**: Verify `engine.devicesByNetwork(networkId)` returns correct devices

### **Latency always null**
- **Cause**: ICMP ping blocked by firewall
- **Fix**: Allow ICMP on network devices

### **Bandwidth always zero**
- **Cause**: SNMP community string incorrect or SNMP disabled
- **Fix**: Verify SNMP configuration on devices

---

## Summary Table

| Question | Answer |
|----------|--------|
| **Do charts show real data?** | ✅ YES - ICMP ping + SNMP poll |
| **How often do charts update?** | Every 30 seconds |
| **What protocol measures latency?** | ICMP (ping) |
| **What protocol measures bandwidth?** | SNMP (interface statistics) |
| **Are metrics stored in database?** | ✅ YES - PostgreSQL `device_metrics` table |
| **Do charts work offline?** | ✅ YES - All dependencies bundled |
| **Can I filter charts by network?** | ✅ YES - Use Network Detail pages |
| **Do charts handle 500+ devices?** | ✅ YES - Optimized aggregation |
| **Is historical data preserved?** | ✅ YES - Configurable retention (default 30 days) |

---

## Files Reference

- **Data Collection**: `server/src/monitoring/icmp.ts`, `server/src/monitoring/snmp.ts`
- **Scheduling**: `server/src/monitoring/scheduler.ts`
- **Database**: `server/src/repositories/monitoring.repository.ts`
- **Frontend Engine**: `src/lib/nms/engine.ts`
- **React Hook**: `src/lib/nms/useNms.ts`
- **Chart Component**: `src/components/nms/TrendChart.tsx`
- **Dashboard**: `src/routes/index.tsx`
- **Network Detail**: `src/routes/networks.$networkId.tsx`
- **Comparison**: `src/routes/comparison.tsx`

---

**Conclusion**: Every chart displays real monitoring data collected via ICMP and SNMP every 30 seconds! ✅
