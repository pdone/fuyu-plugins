export const METHODS = {
  snapshot: "snapshot",
  refresh: "refresh",
  connect: "connect",
  disconnect: "disconnect",
  copyDownloadLink: "copyDownloadLink",
} as const;

export const TOPICS = {
  state: "state",
} as const;

// Clipboard text only; the plugin never requests this host.
export const DOWNLOAD_URL = "https://github.com/pdone/FreeControl/releases/latest";

export type DeviceKind = "usb" | "wifi";
export type DeviceStatus = "connected" | "idle" | "offline" | "unknown";
export type ConnectionStatus = "unpaired" | "connecting" | "ready" | "offline" | "unauthorized";
export type ErrorCode =
  | "invalid_pairing"
  | "pairing_failed"
  | "unauthorized"
  | "offline"
  | "device_not_found"
  | "device_unavailable"
  | "operation_failed"
  | "service_unavailable"
  | "internal";

export interface Device {
  id: string;
  alias: string;
  kind: DeviceKind;
  connectionId: string;
  status: DeviceStatus;
}

export interface Snapshot {
  status: ConnectionStatus;
  installed: boolean;
  devices: Device[];
  connectedCount: number;
  onlineCount: number;
  sequence: number;
  lastCheckedAt: number | null;
  error: ErrorCode | null;
}

export type CopyDownloadLinkResult = { ok: true } | { ok: false };

export interface DeviceAction {
  deviceId: string;
  status: DeviceStatus;
  changed: boolean;
  warning: string | null;
}

export type CallResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode };

export function emptySnapshot(): Snapshot {
  return {
    status: "unpaired",
    installed: false,
    devices: [],
    connectedCount: 0,
    onlineCount: 0,
    sequence: 0,
    lastCheckedAt: null,
    error: null,
  };
}
