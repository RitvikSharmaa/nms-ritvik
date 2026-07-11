import { useEffect, useState } from "react";
import { getEngine, type NmsEngine } from "./engine";

/**
 * Client-only subscription to the monitoring engine.
 * Returns null during SSR / first paint; render skeletons until ready.
 * `version` increments on every monitoring cycle so consumers re-render.
 */
export function useNms(): { engine: NmsEngine | null; version: number } {
  const [engine, setEngine] = useState<NmsEngine | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const e = getEngine();
    setEngine(e);
    setVersion((v) => v + 1);
    const unsub = e.subscribe(() => setVersion((v) => v + 1));
    return unsub;
  }, []);

  return { engine, version };
}

/** Live clock that updates every second (for "last poll Xs ago" labels). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
