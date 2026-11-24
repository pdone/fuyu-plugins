/// <reference types="node" />
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import type { Context } from "fuyu-plugin";
import {
  METHODS,
  TOPICS,
  emptySnapshot,
  type CallResult,
  type ConnectionStatus,
  type Device,
  type DeviceAction,
  type DeviceStatus,
  type ErrorCode,
  type Snapshot,
} from "./protocol.ts";

export const name = "fuyu-freecontrol";
export const inject = ["clients", "settings"];

const DISCOVERY_FILE = "fuyu-local.json";
const POLL_MS = 2000;
const REQUEST_TIMEOUT_MS = 5000;
const ACTION_TIMEOUT_MS = 30000;
const DISCOVERY_GRACE_MS = 1500;
const MAX_DISCOVERY_BYTES = 16 * 1024;

interface StoredConnection {
  baseUrl: string;
  token: string;
}

interface DiscoveryRecord {
  version?: unknown;
  service?: unknown;
  baseUrl?: unknown;
  token?: unknown;
  issuedAt?: unknown;
}

interface ApiErrorBody {
  code?: string;
  message?: string;
  retryable?: boolean;
}

class HostFailure extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.code = code;
  }
}

export function apply(ctx: Context) {
  let connection: StoredConnection | null = null;
  let latest = emptySnapshot();
  let stopPolling: (() => Promise<void>) | null = null;
  let ticking = false;
  let refreshing = false;
  let missingSince: number | null = null;
  let publishedKey = "";

  const ok = <T,>(data: T): CallResult<T> => ({ ok: true, data });
  const fail = (code: ErrorCode): CallResult<never> => ({ ok: false, code });
  const currentSnapshot = (): Snapshot => ({ ...latest, devices: [...latest.devices] });

  function publish(force = false): void {
    const snapshot = currentSnapshot();
    const key = publishKey(snapshot);
    if (!force && key === publishedKey) return;
    publishedKey = key;
    ctx.clients.publish(TOPICS.state, snapshot);
    void ctx.settings.setup?.({
      needed: snapshot.status !== "ready",
      hint: {
        "zh-CN": "在 FreeControl 设置中开启浮屿设备控制",
        en: "Enable Fuyu device control in FreeControl settings",
      },
    });
  }

  function replaceSnapshot(next: Snapshot, force = false): void {
    latest = next;
    publish(force);
  }

  async function loadDiscovery(): Promise<StoredConnection | null> {
    for (const candidate of discoveryCandidates()) {
      try {
        const metadata = await lstat(candidate);
        if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_DISCOVERY_BYTES) continue;
        const raw = await readFile(candidate, "utf8");
        const record = JSON.parse(raw) as DiscoveryRecord;
        if (
          record.version !== 1
          || record.service !== "freecontrol-fuyu"
          || !isLoopbackUrl(record.baseUrl)
          || typeof record.token !== "string"
          || record.token.length < 8
          || record.token.length > 512
          || typeof record.issuedAt !== "number"
          || !Number.isFinite(record.issuedAt)
        ) continue;
        return { baseUrl: record.baseUrl, token: record.token };
      } catch {
        continue;
      }
    }
    return null;
  }

  async function request<T>(
    baseUrl: string,
    route: string,
    options: { token?: string; method?: "GET" | "POST"; timeoutMs?: number } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    let response: Response;
    try {
      response = await fetch(new URL(route, baseUrl), {
        method: options.method ?? "GET",
        headers,
        signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new HostFailure("offline");
    }
    if (!response.ok) {
      let body: ApiErrorBody = {};
      try {
        body = (await response.json()) as ApiErrorBody;
      } catch {
        body = {};
      }
      throw new HostFailure(mapApiError(response.status, body.code));
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async function pollState(): Promise<Snapshot> {
    if (!connection) return currentSnapshot();
    if (refreshing) return currentSnapshot();
    refreshing = true;
    const active = connection;
    try {
      const state = await request<{
        protocolVersion: number;
        statusSequence: number;
        probed: boolean;
        stale: boolean;
        error: string | null;
        devices: Device[];
      }>(active.baseUrl, "/v1/state", { token: active.token });
      const devices = state.devices.map(normalizeDevice);
      replaceSnapshot({
        status: "ready",
        devices,
        connectedCount: devices.filter((device) => device.status === "connected").length,
        onlineCount: devices.filter((device) => device.status === "idle" || device.status === "connected").length,
        sequence: state.statusSequence,
        lastCheckedAt: Date.now(),
        error: null,
      });
    } catch (error) {
      const code = error instanceof HostFailure ? error.code : "internal";
      const status: ConnectionStatus = code === "unauthorized" ? "unauthorized" : "offline";
      replaceSnapshot({
        ...currentSnapshot(),
        status,
        error: code,
        lastCheckedAt: code === "offline" ? latest.lastCheckedAt : Date.now(),
      });
    } finally {
      refreshing = false;
    }
    return currentSnapshot();
  }

  async function tick(): Promise<void> {
    if (ticking) return;
    ticking = true;
    try {
      const found = await loadDiscovery();
      if (found) {
        missingSince = null;
        if (!connection || connection.baseUrl !== found.baseUrl || connection.token !== found.token) {
          connection = found;
          replaceSnapshot({ ...emptySnapshot(), status: "connecting" }, true);
        }
        await pollState();
        return;
      }
      if (!connection) {
        replaceSnapshot(emptySnapshot());
        return;
      }
      missingSince ??= Date.now();
      if (Date.now() - missingSince >= DISCOVERY_GRACE_MS) {
        connection = null;
        missingSince = null;
        replaceSnapshot(emptySnapshot(), true);
      }
    } finally {
      ticking = false;
    }
  }

  function ensurePolling(): void {
    if (stopPolling) return;
    stopPolling = ctx.setInterval(() => void tick(), POLL_MS);
  }

  async function action(deviceId: string, route: "connect" | "disconnect"): Promise<DeviceAction> {
    if (!connection) throw new HostFailure("offline");
    const result = await request<DeviceAction>(connection.baseUrl, `/v1/devices/${encodeURIComponent(deviceId)}/${route}`, {
      token: connection.token,
      method: "POST",
      timeoutMs: ACTION_TIMEOUT_MS,
    });
    await pollState();
    return result;
  }

  ctx.clients.handle(METHODS.snapshot, () => ok(currentSnapshot()));
  ctx.clients.handle(METHODS.refresh, async () => {
    await tick();
    return ok(currentSnapshot());
  });
  ctx.clients.handle(METHODS.connect, (params: { deviceId?: unknown } = {}) => {
    if (typeof params.deviceId !== "string") return fail("device_not_found");
    return action(params.deviceId, "connect").then(ok, (error: unknown) => fail(errorCode(error)));
  });
  ctx.clients.handle(METHODS.disconnect, (params: { deviceId?: unknown } = {}) => {
    if (typeof params.deviceId !== "string") return fail("device_not_found");
    return action(params.deviceId, "disconnect").then(ok, (error: unknown) => fail(errorCode(error)));
  });

  ensurePolling();
  void tick();
}

// lastCheckedAt advances on every poll, so it must not defeat change detection.
function publishKey(snapshot: Snapshot): string {
  return JSON.stringify({ ...snapshot, lastCheckedAt: null });
}

function normalizeDevice(device: Device): Device {
  const status: DeviceStatus = ["connected", "idle", "offline", "unknown"].includes(device.status)
    ? device.status
    : "unknown";
  return {
    id: device.id,
    alias: device.alias,
    kind: device.kind === "wifi" ? "wifi" : "usb",
    connectionId: device.connectionId,
    status,
  };
}

function discoveryCandidates(): string[] {
  const file = DISCOVERY_FILE;
  if (process.platform === "win32") {
    return process.env.APPDATA ? [path.join(process.env.APPDATA, "FreeControl2", file)] : [];
  }
  if (process.platform === "darwin") {
    return process.env.HOME
      ? [path.join(process.env.HOME, "Library", "Application Support", "FreeControl2", file)]
      : [];
  }
  const root = process.env.XDG_DATA_HOME
    || (process.env.HOME ? path.join(process.env.HOME, ".local", "share") : null);
  return root ? [path.join(root, "FreeControl2", file)] : [];
}

function isLoopbackUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:"
      && (url.hostname === "127.0.0.1" || url.hostname === "localhost")
      && !url.username
      && !url.password
      && (url.pathname === "" || url.pathname === "/")
      && !url.search
      && !url.hash
    );
  } catch {
    return false;
  }
}

function mapApiError(status: number, code: string | undefined): ErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 404) return "device_not_found";
  if (status === 409) return code === "operation_conflict" ? "operation_failed" : "device_unavailable";
  if (status === 422) return "operation_failed";
  if (status === 429) return "service_unavailable";
  if (status >= 500) return "service_unavailable";
  return "operation_failed";
}

function errorCode(error: unknown): ErrorCode {
  return error instanceof HostFailure ? error.code : "internal";
}
