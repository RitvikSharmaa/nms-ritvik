# Chart & Graph Packages Guide

## Main Chart Library

### 📊 **Recharts** v2.15.4

**The primary charting library used for all graphs in NetPulse NMS.**

- **Package**: `recharts@^2.15.4`
- **Type**: React charting library built on D3.js
- **License**: MIT
- **Website**: https://recharts.org/
- **GitHub**: https://github.com/recharts/recharts

---

## Why Recharts?

### ✅ **Advantages**

1. **React-First Design**
   - Built specifically for React applications
   - Uses React components for charts (no imperative API)
   - Declarative syntax matches React philosophy

2. **Rich Chart Types**
   - ✅ Area Charts (used for latency, bandwidth, packet loss trends)
   - ✅ Bar Charts (used for network comparison)
   - ✅ Radar Charts (used for performance comparison)
   - ✅ Line Charts, Pie Charts, Scatter Plots (available)

3. **Responsive & Animated**
   - `<ResponsiveContainer>` automatically resizes charts
   - Built-in smooth animations
   - Touch-friendly for mobile devices

4. **Customizable**
   - Full control over colors, gradients, styles
   - Custom tooltips and labels
   - CSS variable integration for theming

5. **Performance**
   - Efficiently handles large datasets
   - SVG-based rendering
   - Optimized re-renders

6. **Active Development**
   - Regular updates
   - Large community
   - Extensive documentation

---

## Chart Types Used in NetPulse NMS

### 1. **Area Chart** (`<AreaChart>`)

**Used For**: Trend visualization (latency, bandwidth, packet loss)

**Components**:
- `<AreaChart>` - Container
- `<Area>` - Data series
- `<CartesianGrid>` - Grid lines
- `<XAxis>` - Time axis
- `<YAxis>` - Value axis
- `<Tooltip>` - Interactive hover info
- `<defs>` + `<linearGradient>` - Gradient fills

**Example from Code**:
```typescript
// src/components/nms/TrendChart.tsx
<AreaChart data={data}>
  <defs>
    <linearGradient id="grad-latency" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
  <XAxis dataKey="t" tickFormatter={(t) => fmtClock(t)} />
  <YAxis />
  <Tooltip />
  <Area 
    dataKey="latency" 
    stroke="#4f46e5" 
    fill="url(#grad-latency)" 
  />
</AreaChart>
```

**Pages Using Area Charts**:
- Dashboard: 3 area charts (latency, bandwidth, packet loss)
- Network Detail: 2 area charts (latency, bandwidth)

---

### 2. **Bar Chart** (`<BarChart>`)

**Used For**: Side-by-side network comparisons

**Components**:
- `<BarChart>` - Container
- `<Bar>` - Data bars
- `<CartesianGrid>` - Grid lines
- `<XAxis>` - Network names
- `<YAxis>` - Values
- `<Tooltip>` - Interactive info

**Example from Code**:
```typescript
// src/routes/comparison.tsx
<BarChart data={barData}>
  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
  <XAxis dataKey="network" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="latency" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
</BarChart>
```

**Pages Using Bar Charts**:
- Comparison: 2 bar charts (latency, bandwidth)

---

### 3. **Radar Chart** (`<RadarChart>`)

**Used For**: Multi-metric performance comparison across networks

**Components**:
- `<RadarChart>` - Container
- `<Radar>` - Data series per network
- `<PolarGrid>` - Grid
- `<PolarAngleAxis>` - Metric labels
- `<PolarRadiusAxis>` - Value scale
- `<Legend>` - Network names
- `<Tooltip>` - Interactive info

**Example from Code**:
```typescript
// src/routes/comparison.tsx
<RadarChart data={radarData}>
  <PolarGrid stroke="var(--border)" />
  <PolarAngleAxis dataKey="metric" />
  <PolarRadiusAxis domain={[0, 100]} />
  <Radar 
    name="Network-1" 
    dataKey="Network-1" 
    stroke="#4f46e5" 
    fill="#4f46e5" 
    fillOpacity={0.08} 
  />
  <Radar 
    name="Network-2" 
    dataKey="Network-2" 
    stroke="#06b6d4" 
    fill="#06b6d4" 
    fillOpacity={0.08} 
  />
  <Legend />
  <Tooltip />
</RadarChart>
```

**Pages Using Radar Charts**:
- Comparison: 1 radar chart (5 metrics × 5 networks)

---

## Supporting Packages

### 🎨 **Framer Motion** v12.42.2

**Used For**: Chart card animations and transitions

- **Package**: `framer-motion@^12.42.2`
- **Purpose**: Smooth entrance animations for chart containers
- **Website**: https://www.framer.com/motion/

**Example Usage**:
```typescript
// src/routes/index.tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.05 * i }}
>
  <TrendChart ... />
</motion.div>
```

**Animation Effects**:
- Fade-in opacity (0 → 1)
- Slide-up position (y: 8 → 0)
- Staggered delays for multiple cards

---

### 🎯 **Lucide React** v0.575.0

**Used For**: Icons in KPI cards and UI elements

- **Package**: `lucide-react@^0.575.0`
- **Purpose**: Chart-related icons (Activity, Gauge, ArrowDownUp, AlertTriangle, etc.)
- **Website**: https://lucide.dev/

**Icons Used with Charts**:
- `<Gauge>` - Latency metrics
- `<Activity>` - Packet loss metrics
- `<ArrowDownUp>` - Bandwidth metrics
- `<AlertTriangle>` - Active alerts
- `<Server>` - Device counts
- `<Wifi>` / `<WifiOff>` - Online/offline status
- `<Clock>` - Uptime metrics

---

### 🎨 **Tailwind CSS** v4.2.1

**Used For**: Chart styling and theming

- **Package**: `tailwindcss@^4.2.1`
- **Purpose**: Utility classes for chart containers, responsive design
- **Website**: https://tailwindcss.com/

**Chart Styling Features**:
- `glass-panel` - Glassmorphic chart backgrounds
- `rounded-xl` - Rounded corners
- CSS variables for colors (`var(--chart-1)`, `var(--chart-2)`, etc.)
- Responsive grid layouts (`grid-cols-2 md:grid-cols-4 xl:grid-cols-8`)

---

## CSS Variables for Chart Colors

Charts use CSS custom properties for consistent theming:

```css
/* Defined in styles.css */
:root {
  --chart-1: 239 84% 67%;   /* Blue - Latency */
  --chart-2: 188 82% 47%;   /* Cyan - Bandwidth In */
  --chart-3: 162 73% 46%;   /* Teal */
  --chart-4: 262 80% 50%;   /* Purple - Bandwidth Out */
  --chart-5: 346 77% 50%;   /* Red - Packet Loss */
}
```

**Network-Specific Colors**:
```typescript
// src/lib/nms/constants.ts
export const NETWORK_COLORS: Record<NetworkName, string> = {
  "Network-1": "#4f46e5",  // Indigo
  "Network-2": "#06b6d4",  // Cyan
  "Network-3": "#10b981",  // Green
  "Network-4": "#f59e0b",  // Amber
  "Network-5": "#ef4444",  // Red
};
```

---

## Chart Component Architecture

### **Custom Wrapper Component**

**File**: `src/components/nms/TrendChart.tsx`

**Purpose**: Reusable chart wrapper with consistent styling

**Props**:
```typescript
interface TrendChartProps {
  data: Array<Record<string, number>>;  // Time-series data
  series: Series[];                      // Which metrics to display
  unit?: string;                         // Unit suffix (ms, Mbps, %)
  height?: number;                       // Chart height in pixels
}

interface Series {
  key: string;      // Data property name
  label: string;    // Display name in tooltip
  color: string;    // CSS color value
}
```

**Usage Example**:
```typescript
<TrendChart 
  data={engine.trendSeries(undefined, 80)}
  series={[
    { key: "latency", label: "Latency", color: "var(--chart-1)" },
    { key: "packetLoss", label: "Loss", color: "var(--chart-5)" }
  ]}
  unit=" ms"
  height={220}
/>
```

---

## Data Flow: Engine → Recharts

```
NmsEngine.trendSeries()
    ↓
[
  { t: 1720771200000, latency: 12.4, packetLoss: 0.5, ... },
  { t: 1720771230000, latency: 15.1, packetLoss: 0.3, ... },
  ...
]
    ↓
<TrendChart data={...} />
    ↓
<AreaChart data={data}>
  <Area dataKey="latency" />   ← Reads latency property
  <Area dataKey="packetLoss" /> ← Reads packetLoss property
</AreaChart>
    ↓
SVG <path> elements rendered to DOM
    ↓
User sees interactive chart!
```

---

## Chart Features Implemented

### ✅ **Responsive Design**
```typescript
<ResponsiveContainer width="100%" height={220}>
  <AreaChart ...>
</ResponsiveContainer>
```
- Charts automatically resize to container width
- Mobile-friendly touch interactions

### ✅ **Custom Tooltips**
```typescript
<Tooltip
  contentStyle={{
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    fontFamily: "var(--font-mono)",
  }}
  labelFormatter={(t) => fmtClock(Number(t))}
  formatter={(value, name) => [`${value}${unit}`, label]}
/>
```
- Styled to match application theme
- Custom time formatting (HH:MM:SS)
- Unit suffixes (ms, Mbps, %)

### ✅ **Gradient Fills**
```typescript
<defs>
  <linearGradient id="grad-latency" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
  </linearGradient>
</defs>
<Area fill="url(#grad-latency)" />
```
- Beautiful gradient effects
- Improves visual clarity

### ✅ **Custom Axis Formatting**
```typescript
<XAxis
  dataKey="t"
  tickFormatter={(t: number) => fmtClock(t).slice(0, 5)}  // HH:MM
  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
  minTickGap={48}
/>
```
- Time axis shows HH:MM format
- Automatic tick spacing
- Theme-aware colors

### ✅ **Multiple Data Series**
```typescript
<Area dataKey="bandwidthIn" stroke="#06b6d4" fill="url(#grad-in)" />
<Area dataKey="bandwidthOut" stroke="#7c3aed" fill="url(#grad-out)" />
```
- Multiple lines on same chart
- Different colors per series
- Independent gradients

### ✅ **Animation Disabled for Performance**
```typescript
<Area isAnimationActive={false} />
<Bar isAnimationActive={false} />
```
- Disabled to improve performance with frequent updates (every 30s)
- Reduces CPU usage
- Smoother real-time updates

---

## Package Installation

### **Frontend Only**
```bash
npm install recharts@^2.15.4
npm install framer-motion@^12.42.2
npm install lucide-react@^0.575.0
```

### **All Chart-Related Packages**
```bash
npm install \
  recharts@^2.15.4 \
  framer-motion@^12.42.2 \
  lucide-react@^0.575.0 \
  tailwindcss@^4.2.1 \
  clsx@^2.1.1 \
  tailwind-merge@^3.5.0
```

---

## Alternative Chart Libraries (Not Used)

For reference, here are other popular React chart libraries we could have used:

### **Chart.js + react-chartjs-2**
- ❌ Not used: More imperative API
- Canvas-based rendering
- Good for simpler charts

### **Victory**
- ❌ Not used: Steeper learning curve
- More complex API
- Better for custom visualizations

### **Nivo**
- ❌ Not used: Larger bundle size
- Beautiful defaults
- More opinionated styling

### **visx (Airbnb)**
- ❌ Not used: Lower-level D3 primitives
- More control but more code
- Better for custom charts

**Why Recharts Won**:
- ✅ Best balance of simplicity and power
- ✅ React-first design philosophy
- ✅ Excellent TypeScript support
- ✅ Great documentation
- ✅ Active community
- ✅ Perfect for dashboard/monitoring use cases

---

## Chart Performance Optimization

### **1. Disabled Animations**
```typescript
<Area isAnimationActive={false} />
```
- Reduces re-render time
- Better for real-time data updates

### **2. Limited Data Points**
```typescript
const trend = engine.trendSeries(undefined, 80);  // Only last 80 points
```
- Keeps chart rendering fast
- 80 points = 40 minutes of data (at 30s intervals)

### **3. Memoized Data**
```typescript
const trend = useMemo(
  () => engine.trendSeries(networkId, 80),
  [engine, networkId, version]
);
```
- Prevents unnecessary recalculations
- Only recomputes when data changes

### **4. SVG Rendering**
- Recharts uses SVG (not Canvas)
- Better for interactive charts (tooltips, hover)
- Scales well with responsive design

---

## File References

### **Chart Component**
- `src/components/nms/TrendChart.tsx` - Reusable chart wrapper

### **Pages Using Charts**
- `src/routes/index.tsx` - Dashboard (3 area charts)
- `src/routes/networks.$networkId.tsx` - Network detail (2 area charts)
- `src/routes/comparison.tsx` - Comparison (radar, 2 bar charts)

### **Styling**
- `src/styles.css` - Chart color CSS variables
- `src/lib/nms/constants.ts` - Network color constants

### **Data Layer**
- `src/lib/nms/engine.ts` - Data aggregation (trendSeries method)
- `src/lib/nms/format.ts` - Time/number formatting helpers

---

## Summary Table

| Package | Version | Purpose | Used For |
|---------|---------|---------|----------|
| **recharts** | ^2.15.4 | Main charting library | All charts (area, bar, radar) |
| **framer-motion** | ^12.42.2 | Animations | Chart card entrance effects |
| **lucide-react** | ^0.575.0 | Icons | KPI card icons |
| **tailwindcss** | ^4.2.1 | Styling | Chart containers, responsive layout |
| **clsx** | ^2.1.1 | Class merging | Dynamic CSS classes |
| **tailwind-merge** | ^3.5.0 | Tailwind class merging | Conflict resolution |

---

## Quick Start: Creating a New Chart

```typescript
import { TrendChart } from "@/components/nms/TrendChart";
import { useNms } from "@/lib/nms/useNms";

function MyPage() {
  const { engine } = useNms();
  
  // Get data from engine
  const trend = engine.trendSeries(undefined, 60);
  
  // Render chart
  return (
    <div className="glass-panel rounded-xl p-4">
      <h3 className="mb-2 font-display text-sm font-semibold">
        My Custom Chart
      </h3>
      <TrendChart 
        data={trend}
        series={[
          { key: "latency", label: "Latency", color: "var(--chart-1)" }
        ]}
        unit=" ms"
        height={200}
      />
    </div>
  );
}
```

That's it! The TrendChart component handles all the Recharts complexity.

---

## Conclusion

**NetPulse NMS uses Recharts as the primary charting library** for all graph visualizations:

- ✅ **10 charts total** (3 area, 2 area, 1 radar, 2 bar, 1 heatmap, 1 ranking)
- ✅ **Real-time updates** every 30 seconds
- ✅ **Responsive design** works on all screen sizes
- ✅ **Themed styling** using CSS variables
- ✅ **Performance optimized** for large datasets
- ✅ **TypeScript support** for type safety

**Single reusable component** (`TrendChart`) powers most charts, making the codebase maintainable and consistent.
