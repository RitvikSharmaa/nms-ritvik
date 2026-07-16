import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileUp,
  Gauge,
  LayoutDashboard,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NETWORKS } from "@/lib/nms/constants";
import { useNms, useNow } from "@/lib/nms/useNms";
import { fmtClock, timeAgo } from "@/lib/nms/format";
import { Badge } from "@/components/ui/badge";

// Client-only clock component to avoid hydration mismatch
function ClientClock() {
  const [mounted, setMounted] = useState(false);
  const now = useNow();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // During SSR and initial client render, show nothing to avoid mismatch
  if (!mounted) {
    return <span className="font-mono text-xs text-muted-foreground invisible">00:00:00 am</span>;
  }
  
  return <span className="font-mono text-xs text-muted-foreground">{fmtClock(now)}</span>;
}

const MAIN_NAV = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
  { title: "Upload Devices", to: "/upload", icon: FileUp },
  { title: "Alerts", to: "/alerts", icon: AlertTriangle },
  { title: "Reports", to: "/reports", icon: BarChart3 },
  { title: "Comparison", to: "/comparison", icon: Radar },
] as const;

const ADMIN_NAV = [
  { title: "Settings", to: "/settings", icon: Settings },
  { title: "Users", to: "/users", icon: Users },
  { title: "Audit Logs", to: "/audit-logs", icon: ScrollText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { engine, version } = useNms();
  void version;

  const summary = engine?.globalSummary();

  const navItem = (to: string, title: string, Icon: typeof Gauge, badge?: number) => {
    const active = pathname === to;
    return (
      <Link
        key={to}
        to={to}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-primary glow-ring"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
        title={collapsed ? title : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{title}</span>}
        {!collapsed && badge !== undefined && badge > 0 && (
          <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1 font-mono text-[10px]">
            {badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-30 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Activity className="h-4 w-4" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold tracking-tight">
                Setu
              </p>
              <p className="text-[10px] text-muted-foreground">Network Monitoring</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-2">
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Operations
              </p>
            )}
            {navItem("/", "Dashboard", LayoutDashboard)}
            {navItem("/alerts", "Alerts", AlertTriangle, summary?.activeAlerts)}
            {navItem("/comparison", "Comparison", Radar)}
            {navItem("/reports", "Reports", BarChart3)}
            {navItem("/upload", "Upload Devices", FileUp)}
          </div>

          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Networks
              </p>
            )}
            {NETWORKS.map((n) => {
              const s = engine?.networkSummary(n);
              const active = pathname === `/networks/${n}`;
              return (
                <Link
                  key={n}
                  to="/networks/$networkId"
                  params={{ networkId: n }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                  title={collapsed ? n : undefined}
                >
                  <Network className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="flex-1">{n}</span>}
                  {!collapsed && s && (
                    <span
                      className="status-dot"
                      style={{
                        backgroundColor:
                          s.offline > 0
                            ? "var(--destructive)"
                            : s.degraded > 0
                              ? "var(--warning)"
                              : "var(--success)",
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Administration
              </p>
            )}
            {ADMIN_NAV.map((i) => navItem(i.to, i.title, i.icon))}
          </div>
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-11 items-center justify-center gap-2 border-t border-sidebar-border text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && "Collapse"}
        </button>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-panel sticky top-0 z-20 flex h-14 items-center gap-4 border-x-0 border-t-0 px-5">
          <Gauge className="h-4 w-4 text-primary" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="status-dot pulse-live" style={{ backgroundColor: "var(--success)" }} />
            <span className="hidden sm:inline">Monitoring engine</span>
            <span className="font-mono text-foreground/80">
              {engine ? `cycle ${timeAgo(engine.lastCycleAt, Date.now())}` : "starting…"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {summary && (
              <div className="hidden items-center gap-3 font-mono text-xs md:flex">
                <span style={{ color: "var(--success)" }}>▲ {summary.online} up</span>
                <span style={{ color: "var(--warning)" }}>◆ {summary.degraded} degraded</span>
                <span style={{ color: "var(--destructive)" }}>▼ {summary.offline} down</span>
              </div>
            )}
            <ClientClock />
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-semibold text-primary">
              AD
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
