import { METHODS, type Snapshot } from "../src/protocol.ts";

const state: Snapshot = {
  status: "ready",
  devices: [
    {
      id: "demo-living-room",
      alias: "客厅平板",
      kind: "wifi",
      connectionId: "192.168.1.5:5555",
      status: "idle",
    },
    {
      id: "demo-main-phone",
      alias: "主力机",
      kind: "usb",
      connectionId: "DEMO-SERIAL-02",
      status: "connected",
    },
    {
      id: "demo-backup-phone",
      alias: "备用机",
      kind: "usb",
      connectionId: "DEMO-SERIAL-03",
      status: "offline",
    },
  ],
  connectedCount: 1,
  onlineCount: 2,
  sequence: 12,
  lastCheckedAt: Date.parse("2026-11-24T10:24:00+08:00"),
  error: null,
};

export default {
  now: "2026-11-24T10:24:00+08:00",
  host: {
    calls: {
      [METHODS.snapshot]: state,
    },
    events: [{ topic: "state", data: state }],
  },
  shots: [
    { slot: "island.page/v1", file: "page.png" },
    { slot: "island.collapsed/v1", file: "bar.png" },
  ],
};
