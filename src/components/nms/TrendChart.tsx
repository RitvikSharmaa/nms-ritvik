import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtClock } from "@/lib/nms/format";

interface Series {
  key: string;
  label: string;
  color: string;
}

interface TrendChartProps {
  data: Array<Record<string, number>>;
  series: Series[];
  unit?: string;
  height?: number;
}

export function TrendChart({ data, series, unit = "", height = 220 }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(t: number) => fmtClock(t).slice(0, 5)}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          minTickGap={48}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
          labelFormatter={(t) => fmtClock(Number(t))}
          formatter={(value: number, name: string) => [
            `${value}${unit}`,
            series.find((s) => s.key === name)?.label ?? name,
          ]}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={1.8}
            fill={`url(#grad-${s.key})`}
            isAnimationActive={false}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
