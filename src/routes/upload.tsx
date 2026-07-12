import { useCallback, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNms } from "@/lib/nms/useNms";
import { checkHeaders, parseUploadFile, sampleCsv, validateRows } from "@/lib/nms/importer";
import type { ImportRow } from "@/lib/nms/types";
import { LinkBadges } from "@/components/nms/badges";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Devices — NetPulse NMS" },
      {
        name: "description",
        content:
          "Bulk-import network devices from CSV or Excel with full validation: IP format, duplicates, networks and link assignments.",
      },
      { property: "og:title", content: "Upload Devices — NetPulse NMS" },
      { property: "og:description", content: "CSV/XLSX device import with validation and preview." },
    ],
  }),
  component: UploadPage,
});

interface ParseState {
  fileName: string;
  rows: ImportRow[];
  headerErrors: string[];
}

interface ImportResult {
  created: number;
  updated: number;
  removed: number;
}

function UploadPage() {
  const { engine } = useNms();
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [state, setState] = useState<ParseState | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [replaceInventory, setReplaceInventory] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!engine) return;
      setParsing(true);
      setImported(null);
      try {
        const raw = await parseUploadFile(file);
        const headerErrors = checkHeaders(raw);
        const rows = headerErrors.length === 0 ? validateRows(raw, engine) : [];
        setState({ fileName: file.name, rows, headerErrors });
        if (headerErrors.length > 0) toast.error("File is missing required columns.");
        else toast.success(`Parsed ${rows.length} rows from ${file.name}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to parse file.");
      } finally {
        setParsing(false);
      }
    },
    [engine],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const doImport = () => {
    if (!engine || !state) return;
    const result = engine.importDevices(state.rows, state.fileName, { replaceInventory });
    setImported(result);
    const parts = [
      `${result.created} created`,
      `${result.updated} updated`,
      replaceInventory ? `${result.removed} removed` : null,
    ].filter(Boolean);
    toast.success(`Inventory synced — ${parts.join(", ")}. Monitoring active.`);
  };

  const downloadTemplate = () => {
    const blob = new Blob([sampleCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "device-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const valid = state?.rows.filter((r) => r.errors.length === 0) ?? [];
  const invalid = state?.rows.filter((r) => r.errors.length > 0) ?? [];
  const creates = valid.filter((r) => r.action === "create").length;
  const updates = valid.filter((r) => r.action === "update").length;
  
  const invalidIps = invalid.filter((r) => r.errors.some((e) => e.includes("Invalid IP")));
  const badNetworks = invalid.filter((r) => r.errors.some((e) => e.includes("Unknown network")));
  const badLinks = invalid.filter((r) => r.errors.some((e) => e.includes("Unknown link")));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Upload Devices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import devices from CSV or Excel. Columns: Username, IP Address, Device Name, Link,
            Network Name.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download template
        </Button>
      </div>

      {/* Dropzone */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "glass-panel flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-14 transition-all",
          dragOver ? "border-primary glow-ring" : "border-border hover:border-primary/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.currentTarget.value = "";
          }}
        />
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          {parsing ? (
            <UploadCloud className="h-6 w-6 animate-bounce" />
          ) : (
            <FileUp className="h-6 w-6" />
          )}
        </span>
        <p className="mt-4 font-display text-sm font-semibold">
          {parsing ? "Parsing file…" : "Drag & drop a CSV or XLSX file"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">or click to browse — max one file</p>
        <div className="mt-3 flex gap-2">
          <Badge variant="secondary" className="font-mono text-[10px]">.csv</Badge>
          <Badge variant="secondary" className="font-mono text-[10px]">.xlsx</Badge>
        </div>
      </motion.div>

      {state && state.headerErrors.length > 0 && (
        <div className="glass-panel rounded-xl border-destructive/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertCircle className="h-4 w-4" /> Invalid file structure
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
            {state.headerErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {state && state.headerErrors.length === 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <SummaryTile label="Total Rows" value={state.rows.length} color="var(--primary)" />
            <SummaryTile label="Will Create" value={creates} color="var(--success)" />
            <SummaryTile label="Will Update" value={updates} color="var(--primary)" />
            <SummaryTile label="Failed" value={invalid.length} color="var(--destructive)" />
            <SummaryTile label="Invalid IPs" value={invalidIps.length} color="var(--warning)" />
            <SummaryTile label="Bad Net/Link" value={badNetworks.length + badLinks.length} color="var(--warning)" />
          </div>

          <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <Switch
                id="replace-inventory"
                checked={replaceInventory}
                onCheckedChange={setReplaceInventory}
                disabled={imported !== null}
              />
              <div>
                <Label htmlFor="replace-inventory" className="text-sm font-semibold">
                  Replace inventory (source-of-truth mode)
                </Label>
                <p className="text-xs text-muted-foreground">
                  {replaceInventory
                    ? "Devices absent from this file will be removed. Uploaded file becomes the active inventory."
                    : "Merge only — existing devices not in this file will be kept."}
                </p>
              </div>
            </div>
            {replaceInventory && engine && (
              <span className="font-mono text-[11px] text-warning">
                {Math.max(0, engine.devices.size - updates)} existing device(s) will be removed
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={doImport} disabled={valid.length === 0 || imported !== null}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {imported !== null
                ? `Synced: +${imported.created} ~${imported.updated} -${imported.removed}`
                : `Sync ${valid.length} row(s) → inventory`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setState(null);
                setImported(null);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              <FileSpreadsheet className="mr-1 inline h-3.5 w-3.5" />
              {state.fileName}
            </span>
          </div>


          <Tabs defaultValue="all">
            <TabsList className="bg-secondary">
              <TabsTrigger value="all">All ({state.rows.length})</TabsTrigger>
              <TabsTrigger value="valid">Valid ({valid.length})</TabsTrigger>
              <TabsTrigger value="invalid">Failed ({invalid.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <PreviewTable rows={state.rows} />
            </TabsContent>
            <TabsContent value="valid">
              <PreviewTable rows={valid} />
            </TabsContent>
            <TabsContent value="invalid">
              <PreviewTable rows={invalid} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-panel rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function PreviewTable({ rows }: { rows: ImportRow[] }) {
  return (
    <div className="glass-panel mt-3 overflow-x-auto rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2.5">Row</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Username</th>
            <th className="px-3 py-2.5">IP Address</th>
            <th className="px-3 py-2.5">Device Name</th>
            <th className="px-3 py-2.5">Links</th>
            <th className="px-3 py-2.5">Network</th>
            <th className="px-3 py-2.5">Validation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.rowNumber}
              className={cn(
                "border-b border-border/50",
                r.errors.length > 0 && "bg-destructive/5",
              )}
            >
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.rowNumber}</td>
              <td className="px-3 py-2">
                {r.errors.length === 0 ? (
                  <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </td>
              <td className="px-3 py-2 text-xs">{r.username || "—"}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.ip || "—"}</td>
              <td className="px-3 py-2 text-xs">{r.deviceName || "—"}</td>
              <td className="px-3 py-2">
                {r.links.length > 0 ? (
                  <LinkBadges links={r.links} />
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">{r.linkRaw || "—"}</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs">{r.networkRaw || "—"}</td>
              <td className="px-3 py-2">
                {r.errors.length === 0 ? (
                  <span className="text-xs" style={{ color: "var(--success)" }}>
                    Ready to import
                  </span>
                ) : (
                  <ul className="space-y-0.5">
                    {r.errors.map((e, i) => (
                      <li key={i} className="text-xs text-destructive">
                        {e}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                No rows.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
