import { METHODS, emptySnapshot, type Snapshot } from "../src/protocol.ts";

const state: Snapshot = {
  ...emptySnapshot(),
  installed: true,
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
    { slot: "island.page/v1", file: "unready.png" },
    { slot: "island.collapsed/v1", file: "bar-unready.png" },
  ],
};
