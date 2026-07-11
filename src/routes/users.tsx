import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNms, useNow } from "@/lib/nms/useNms";
import { timeAgo } from "@/lib/nms/format";
import type { UserRole } from "@/lib/nms/types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — NetPulse NMS" },
      {
        name: "description",
        content: "Role-based user management: administrators, operators and viewers.",
      },
      { property: "og:title", content: "Users — NetPulse NMS" },
      { property: "og:description", content: "Manage NOC user accounts and roles." },
    ],
  }),
  component: UsersPage,
});

const ROLE_COLOR: Record<UserRole, string> = {
  admin: "var(--destructive)",
  operator: "var(--warning)",
  viewer: "var(--info)",
};

function UsersPage() {
  const { engine, version } = useNms();
  const now = useNow(10000);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  void version;

  if (!engine) return <div className="h-96 animate-pulse rounded-xl bg-muted/60" />;

  const addUser = () => {
    if (!username.trim() || !fullName.trim()) {
      toast.error("Username and full name are required.");
      return;
    }
    if (engine.users.some((u) => u.username === username.trim())) {
      toast.error("Username already exists.");
      return;
    }
    engine.addUser({
      username: username.trim(),
      fullName: fullName.trim(),
      email: email.trim() || `${username.trim()}@corp.local`,
      role,
      active: true,
    });
    toast.success(`User ${username} created.`);
    setOpen(false);
    setUsername("");
    setFullName("");
    setEmail("");
    setRole("viewer");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Role-based access: admin · operator · viewer
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add user
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-display">Create user</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@corp.local" className="bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={addUser}>
                Create user
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-panel overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5">User</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Last Login</th>
              <th className="px-4 py-2.5">Active</th>
            </tr>
          </thead>
          <tbody>
            {engine.users.map((u) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-accent/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-semibold text-primary">
                      {u.fullName
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm">{u.fullName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <Select value={u.role} onValueChange={(v) => engine.updateUserRole(u.id, v as UserRole)}>
                    <SelectTrigger className="h-8 w-32 bg-background/50 text-xs">
                      <SelectValue>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase"
                          style={{
                            color: ROLE_COLOR[u.role],
                            borderColor: `color-mix(in oklab, ${ROLE_COLOR[u.role]} 45%, transparent)`,
                          }}
                        >
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          {u.role}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {u.lastLogin ? timeAgo(u.lastLogin, now) : "never"}
                </td>
                <td className="px-4 py-3">
                  <Switch checked={u.active} onCheckedChange={() => engine.toggleUser(u.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
