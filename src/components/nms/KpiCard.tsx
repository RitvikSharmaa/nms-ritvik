import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  delay?: number;
}

const TONES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
};

export function KpiCard({ title, value, sub, icon: Icon, tone = "default", delay = 0 }: KpiCardProps) {
  const c = TONES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass-panel rounded-xl p-4"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-2 font-mono text-2xl font-semibold tracking-tight")} style={{ color: c }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}
