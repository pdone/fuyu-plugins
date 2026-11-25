import { METHODS, emptySnapshot, type Snapshot } from "../src/protocol.ts";

const state: Snapshot = {
  ...emptySnapshot(),
  installed: false,
};

export default {
  now: "2026-11-25T10:24:00+08:00",
  host: {
    calls: {
      [METHODS.snapshot]: state,
      [METHODS.copyDownloadLink]: { ok: true },
    },
    events: [{ topic: "state", data: state }],
  },
  shots: [
    { slot: "island.page/v1", file: "missing.png" },
    { slot: "island.collapsed/v1", file: "bar-missing.png" },
  ],
};
