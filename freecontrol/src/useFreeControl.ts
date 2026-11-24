import { useCallback, useEffect, useState } from "react";
import type { Context } from "fuyu-plugin";
import {
  METHODS,
  TOPICS,
  emptySnapshot,
  type CallResult,
  type DeviceAction,
  type ErrorCode,
  type Snapshot,
} from "./protocol.ts";

export function useFreeControl(ctx: Context) {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"connect" | "disconnect" | null>(null);

  useEffect(() => {
    const take = (next: Snapshot) => setSnapshot(next);
    const off = ctx.host.on(TOPICS.state, take);
    void callSnapshot();
    return () => {
      void off();
    };
  }, [ctx]);

  async function callSnapshot(): Promise<Snapshot | null> {
    try {
      const result = await ctx.host.call<CallResult<Snapshot>>(METHODS.snapshot);
      if (!result.ok) {
        setError(result.code);
        return null;
      }
      setSnapshot(result.data);
      return result.data;
    } catch {
      setError("internal");
      return null;
    }
  }

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await ctx.host.call<CallResult<Snapshot>>(METHODS.refresh);
      if (!result.ok) {
        setError(result.code);
        return;
      }
      setSnapshot(result.data);
    } catch {
      setError("internal");
    }
  }, [ctx]);

  const runAction = useCallback(async (deviceId: string, action: "connect" | "disconnect"): Promise<void> => {
    setBusyDeviceId(deviceId);
    setBusyAction(action);
    setError(null);
    try {
      const method = action === "connect" ? METHODS.connect : METHODS.disconnect;
      const result = await ctx.host.call<CallResult<DeviceAction>>(method, { deviceId });
      if (!result.ok) {
        setError(result.code);
        return;
      }
      await callSnapshot();
    } catch {
      setError("internal");
    } finally {
      setBusyDeviceId(null);
      setBusyAction(null);
    }
  }, [ctx]);

  return {
    snapshot,
    error,
    busyDeviceId,
    busyAction,
    refresh,
    runAction,
  };
}
