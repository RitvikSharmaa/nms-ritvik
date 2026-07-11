declare module "ping" {
  export interface PingConfig {
    timeout?: number;
    min_reply?: number;
    extra?: string[];
  }
  export interface PingResponse {
    host: string;
    alive: boolean;
    time: number | "unknown";
    min: string;
    max: string;
    avg: string;
    packetLoss: string;
    output: string;
  }
  export const promise: {
    probe(host: string, config?: PingConfig): Promise<PingResponse>;
  };
}

declare module "net-snmp" {
  export interface Varbind {
    oid: string;
    type: number;
    value: unknown;
  }
  export interface Session {
    get(
      oids: string[],
      callback: (error: Error | null, varbinds: Varbind[]) => void,
    ): void;
    close(): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
  }
  export interface SessionOptions {
    port?: number;
    retries?: number;
    timeout?: number;
    version?: unknown;
  }
  export const Version1: unknown;
  export const Version2c: unknown;
  export function createSession(
    target: string,
    community: string,
    options?: SessionOptions,
  ): Session;
  export function isVarbindError(varbind: Varbind): boolean;
}

declare module "csv-parser" {
  import { Transform } from "stream";
  interface Options {
    mapHeaders?: (args: { header: string; index: number }) => string | null;
    separator?: string;
    skipLines?: number;
  }
  function csvParser(options?: Options): Transform;
  export = csvParser;
}
