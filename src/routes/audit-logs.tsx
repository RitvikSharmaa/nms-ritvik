import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNms } from "@/lib/nms/useNms";
import { fmtDateTime } from "@/lib/nms/format";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Setu" },
      {
        name: "description",
        content: "Complete audit trail of administrative actions: imports, alert handling, settings and user management.",
      },
      { property: "og:title", content: "Audit Logs — Setu" },
      { property: "og:description", content: "Administrative audit trail for the NOC." },
    ],
  }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const { engine, version } = useNms();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  void version;

  const logs = engine?.auditLogs ?? [];

  const actionTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (action !== "all" && l.action !== action) return false;
      if (
        q &&
        !l.username.toLowerCase().includes(q) &&
        !l.target.toLowerCase().includes(q) &&
        !l.details.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [logs, search, action]);

  if (!engine) return <div className="h-96 animate-pulse rounded-xl bg-muted/60" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Immutable trail of administrative activity
        </p>
      </div>

      <div className="glass-panel rounded-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user, target, details…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 border-input bg-background/50 pl-8"
            />
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-9 w-52 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionTypes.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {filtered.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Target</th>
                <th className="px-4 py-2.5">Details</th>
                <th className="px-4 py-2.5">Source IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {fmtDateTime(l.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">@{l.username}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {l.action}
                    </Badge>
                  </td>
                  <td className="max-w-48 truncate px-4 py-2.5 text-xs">{l.target}</td>
                  <td className="max-w-md truncate px-4 py-2.5 text-xs text-muted-foreground">
                    {l.details || "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {l.ipAddress}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No audit entries yet. Actions like imports, alert handling and settings changes
                    are recorded here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
