import { METHODS, type Snapshot } from "../src/protocol.ts";

const state: Snapshot = {
  status: "offline",
  installed: true,
  devices: [
    {
      id: "demo-offline",
      alias: "客厅平板",
      kind: "wifi",
      connectionId: "192.168.1.5:5555",
      status: "idle",
    },
  ],
  connectedCount: 0,
  onlineCount: 1,
  sequence: 12,
  lastCheckedAt: Date.parse("2026-11-25T10:24:00+08:00"),
  error: "offline",
};

export default {
  now: "2026-11-25T10:24:00+08:00",
  host: {
    calls: {
      [METHODS.snapshot]: state,
    },
    events: [{ topic: "state", data: state }],
  },
  shots: [
    { slot: "island.page/v1", file: "offline.png" },
    { slot: "island.collapsed/v1", file: "bar-offline.png" },
  ],
};
