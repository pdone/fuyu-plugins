import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { clearInterval as nodeClearInterval, setInterval as nodeSetInterval, setTimeout as nodeSetTimeout } from "node:timers";
import { apply } from "../src/host.ts";
import { DOWNLOAD_URL, METHODS, emptySnapshot } from "../src/protocol.ts";

const delay = (ms) => new Promise((resolve) => nodeSetTimeout(resolve, ms));

async function waitFor(predicate) {
  for (let index = 0; index < 100; index += 1) {
    if (predicate()) return;
    await delay(20);
  }
  throw new Error("condition not reached");
}

function createContext(dataDir, clipboard = null) {
  const handlers = new Map();
  const publications = [];
  const setups = [];
  const intervals = [];
  return {
    handlers,
    publications,
    setups,
    intervals,
    ctx: {
      dataDir,
      services: {
        get() {
          if (!clipboard) throw new Error("clipboard unavailable");
          return clipboard;
        },
      },
      clients: {
        handle(method, handler) {
          handlers.set(method, handler);
          return async () => handlers.delete(method);
        },
        publish(topic, data) {
          publications.push({ topic, data });
        },
      },
      settings: {
        setup: async (options) => {
          setups.push(options);
        },
      },
      setInterval(callback, ms) {
        const timer = nodeSetInterval(callback, ms);
        intervals.push(timer);
        return async () => nodeClearInterval(timer);
      },
    },
  };
}

function discoveryPath(root) {
  if (process.platform === "win32") return path.join(root, "roaming", "FreeControl2", "fuyu-local.json");
  if (process.platform === "darwin") return path.join(root, "home", "Library", "Application Support", "FreeControl2", "fuyu-local.json");
  return path.join(root, "data", "FreeControl2", "fuyu-local.json");
}

function dataRoot(root) {
  return path.dirname(discoveryPath(root));
}

function setDiscoveryEnv(root, t) {
  const keys = ["APPDATA", "HOME", "XDG_DATA_HOME"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  if (process.platform === "win32") process.env.APPDATA = path.join(root, "roaming");
  if (process.platform === "darwin") process.env.HOME = path.join(root, "home");
  if (process.platform === "linux") {
    process.env.XDG_DATA_HOME = path.join(root, "data");
    process.env.HOME = path.join(root, "home");
  }
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

async function writeDiscovery(file, baseUrl, token, overrides = {}) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ version: 1, service: "freecontrol-fuyu", baseUrl, token, issuedAt: Date.now(), ...overrides }));
}

function createServer(handler) {
  return http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    response.setHeader("content-type", "application/json");
    await handler(request, response, Buffer.concat(chunks).toString());
  });
}

const STATE = {
  protocolVersion: 1,
  statusSequence: 7,
  probed: true,
  stale: false,
  error: null,
  devices: [
    { id: "dev-a", alias: "测试设备", kind: "usb", connectionId: "SERIAL-A", status: "idle" },
    { id: "dev-b", alias: "无线设备", kind: "wifi", connectionId: "192.0.2.10:5555", status: "connected" },
    { id: "dev-c", alias: "离线设备", kind: "usb", connectionId: "SERIAL-C", status: "offline" },
    { id: "dev-d", alias: "未知设备", kind: "usb", connectionId: "SERIAL-D", status: "probing" },
  ],
};

test("host auto-discovers, reconnects and invokes device actions", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fuyu-auto-discovery-"));
  setDiscoveryEnv(root, t);
  const file = discoveryPath(root);
  const dataDir = path.join(root, "plugin-data");
  const requests = [];
  let acceptedToken = "token-one";
  const server = createServer((request, response, body) => {
    requests.push({ method: request.method, url: request.url, headers: request.headers, body });
    if (request.headers.authorization !== `Bearer ${acceptedToken}`) {
      response.statusCode = 401;
      response.end(JSON.stringify({ code: "unauthorized", message: "no", retryable: false }));
      return;
    }
    if (request.url === "/v1/state" && request.method === "GET") {
      response.end(JSON.stringify(STATE));
      return;
    }
    if (request.url === "/v1/devices/dev-a/connect" && request.method === "POST") {
      response.end(JSON.stringify({ deviceId: "dev-a", status: "connected", changed: true, warning: null }));
      return;
    }
    if (request.url === "/v1/devices/dev-a/disconnect" && request.method === "POST") {
      response.end(JSON.stringify({ deviceId: "dev-a", status: "idle", changed: true, warning: null }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: "device_not_found", message: "no", retryable: false }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const harness = createContext(dataDir);
  t.after(async () => {
    for (const timer of harness.intervals) nodeClearInterval(timer);
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });

  apply(harness.ctx);
  await waitFor(() => harness.publications.length > 0);
  assert.deepEqual(await harness.handlers.get(METHODS.snapshot)(), { ok: true, data: emptySnapshot() });
  assert.equal(harness.setups[0].needed, true);
  assert.deepEqual(harness.setups[0].hint, {
    "zh-CN": "安装并开启 FreeControl",
    en: "Install and enable FreeControl",
  });

  await writeDiscovery(file, baseUrl, "token-one");
  const discovered = await harness.handlers.get(METHODS.refresh)();
  assert.equal(discovered.ok, true);
  assert.equal(discovered.data.status, "ready");
  assert.equal(discovered.data.installed, true);
  assert.equal(discovered.data.devices.length, 4);
  assert.equal(discovered.data.devices[0].alias, "测试设备");
  assert.equal(discovered.data.devices[3].status, "unknown");
  assert.equal(discovered.data.connectedCount, 1);
  assert.equal(discovered.data.onlineCount, 2);
  assert.equal(discovered.data.sequence, 7);
  assert.equal(typeof discovered.data.lastCheckedAt, "number");
  assert.equal(harness.setups.at(-1).needed, false);

  const publicationsAfterDiscovery = harness.publications.length;
  await harness.handlers.get(METHODS.refresh)();
  await harness.handlers.get(METHODS.refresh)();
  assert.equal(harness.publications.length, publicationsAfterDiscovery);

  const latest = harness.handlers.get(METHODS.connect);
  const missing = await latest({});
  assert.deepEqual(missing, { ok: false, code: "device_not_found" });
  const stateRequestsBeforeAction = requests.filter((request) => request.url === "/v1/state").length;
  const connected = await latest({ deviceId: "dev-a", args: ["--max-size=0"] });
  assert.deepEqual(connected, { ok: true, data: { deviceId: "dev-a", status: "connected", changed: true, warning: null } });
  const connectRequest = requests.find((request) => request.url === "/v1/devices/dev-a/connect");
  assert.equal(connectRequest.method, "POST");
  assert.equal(connectRequest.body, "");
  assert.ok(!connectRequest.url.includes("?"));
  assert.ok(requests.filter((request) => request.url === "/v1/state").length > stateRequestsBeforeAction);

  const disconnected = await harness.handlers.get(METHODS.disconnect)({ deviceId: "dev-a" });
  assert.deepEqual(disconnected, { ok: true, data: { deviceId: "dev-a", status: "idle", changed: true, warning: null } });
  const disconnectRequest = requests.find((request) => request.url === "/v1/devices/dev-a/disconnect");
  assert.equal(disconnectRequest.method, "POST");
  assert.equal(disconnectRequest.body, "");

  acceptedToken = "token-two";
  await writeDiscovery(file, baseUrl, "token-two");
  const reconnected = await harness.handlers.get(METHODS.refresh)();
  assert.equal(reconnected.ok, true);
  assert.equal(reconnected.data.status, "ready");
  assert.ok(requests.some((request) => request.headers.authorization === "Bearer token-two"));
  assert.ok(!JSON.stringify(harness.publications).includes("token-one"));
  assert.ok(!JSON.stringify(harness.publications).includes("token-two"));
  await assert.rejects(stat(dataDir));
  await assert.rejects(readFile(path.join(dataDir, "freecontrol-connection.json"), "utf8"));

  await rm(file);
  await harness.handlers.get(METHODS.refresh)();
  await delay(1700);
  const revoked = await harness.handlers.get(METHODS.refresh)();
  assert.equal(revoked.ok, true);
  assert.equal(revoked.data.status, "unpaired");
  assert.equal(revoked.data.installed, true);
  assert.deepEqual(revoked.data.devices, []);
  assert.deepEqual(harness.setups.at(-1).hint, {
    "zh-CN": "在 FreeControl 设置中开启浮屿设备控制",
    en: "Enable Fuyu device control in FreeControl settings",
  });
});

test("host distinguishes missing data root from installed but unpaired", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fuyu-install-presence-"));
  setDiscoveryEnv(root, t);
  const harness = createContext(path.join(root, "plugin-data"));
  t.after(async () => {
    for (const timer of harness.intervals) nodeClearInterval(timer);
    await rm(root, { recursive: true, force: true });
  });

  apply(harness.ctx);
  await waitFor(() => harness.publications.length > 0);
  const missing = await harness.handlers.get(METHODS.snapshot)();
  assert.equal(missing.data.installed, false);
  assert.deepEqual(harness.setups.at(-1).hint, {
    "zh-CN": "安装并开启 FreeControl",
    en: "Install and enable FreeControl",
  });

  await mkdir(dataRoot(root), { recursive: true });
  const installed = await harness.handlers.get(METHODS.refresh)();
  assert.equal(installed.data.installed, true);
  assert.equal(installed.data.status, "unpaired");
  assert.deepEqual(harness.setups.at(-1).hint, {
    "zh-CN": "在 FreeControl 设置中开启浮屿设备控制",
    en: "Enable Fuyu device control in FreeControl settings",
  });
});

test("host treats data-root probe failures as installed", { skip: process.platform === "win32" }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fuyu-install-probe-"));
  setDiscoveryEnv(root, t);
  const parent = path.dirname(dataRoot(root));
  await mkdir(dataRoot(root), { recursive: true });
  await chmod(parent, 0);
  const harness = createContext(path.join(root, "plugin-data"));
  t.after(async () => {
    for (const timer of harness.intervals) nodeClearInterval(timer);
    await chmod(parent, 0o700);
    await rm(root, { recursive: true, force: true });
  });

  apply(harness.ctx);
  await waitFor(() => harness.publications.length > 0);
  const result = await harness.handlers.get(METHODS.snapshot)();
  assert.equal(result.data.installed, true);
  assert.equal(result.data.status, "unpaired");
});

test("copy download link uses the clipboard service when available", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fuyu-copy-link-"));
  setDiscoveryEnv(root, t);
  const copied = [];
  const available = createContext(path.join(root, "available"), {
    copyText: async ({ text }) => {
      copied.push(text);
      return { ok: true };
    },
  });
  const missing = createContext(path.join(root, "missing"));
  t.after(async () => {
    for (const timer of [...available.intervals, ...missing.intervals]) nodeClearInterval(timer);
    await rm(root, { recursive: true, force: true });
  });

  apply(available.ctx);
  apply(missing.ctx);
  await waitFor(() => missing.publications.length > 0);
  assert.deepEqual(await available.handlers.get(METHODS.copyDownloadLink)(), { ok: true });
  assert.deepEqual(copied, [DOWNLOAD_URL]);
  assert.deepEqual(await missing.handlers.get(METHODS.copyDownloadLink)(), { ok: false });
});

test("invalid discovery records are ignored", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fuyu-invalid-discovery-"));
  setDiscoveryEnv(root, t);
  const file = discoveryPath(root);
  const harness = createContext(path.join(root, "plugin-data"));
  t.after(async () => {
    for (const timer of harness.intervals) nodeClearInterval(timer);
    await rm(root, { recursive: true, force: true });
  });

  apply(harness.ctx);
  await waitFor(() => harness.publications.length > 0);

  const cases = [
    { service: "other-service" },
    { version: 2 },
    { baseUrl: "http://0.0.0.0:1234" },
    { token: "short" },
    { issuedAt: "not-a-number" },
  ];
  for (const overrides of cases) {
    await writeDiscovery(file, "http://127.0.0.1:1234", "valid-token", overrides);
    const result = await harness.handlers.get(METHODS.refresh)();
    assert.deepEqual(result, { ok: true, data: { ...emptySnapshot(), installed: true } });
  }

  await writeFile(
    file,
    JSON.stringify({
      version: 1,
      service: "freecontrol-fuyu",
      baseUrl: "http://127.0.0.1:1234",
      token: "valid-token",
      issuedAt: Date.now(),
      padding: "x".repeat(17 * 1024),
    }),
  );
  const oversized = await harness.handlers.get(METHODS.refresh)();
  assert.deepEqual(oversized, { ok: true, data: { ...emptySnapshot(), installed: true } });
});

test("server errors map to stable codes and unauthorized state", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "fuyu-errors-"));
  setDiscoveryEnv(root, t);
  const file = discoveryPath(root);
  const dataDir = path.join(root, "plugin-data");
  let stateStatus = 200;
  let actionStatus = 200;
  let actionCode = "error";
  const server = createServer((request, response) => {
    if (request.headers.authorization !== "Bearer token-one") {
      response.statusCode = 401;
      response.end(JSON.stringify({ code: "unauthorized", message: "no", retryable: false }));
      return;
    }
    if (request.url === "/v1/state") {
      if (stateStatus !== 200) {
        response.statusCode = stateStatus;
        response.end(JSON.stringify({ code: "unauthorized", message: "no", retryable: false }));
        return;
      }
      response.end(JSON.stringify(STATE));
      return;
    }
    if (actionStatus !== 200) {
      response.statusCode = actionStatus;
      response.end(JSON.stringify({ code: actionCode, message: "no", retryable: false }));
      return;
    }
    response.end(JSON.stringify({ deviceId: "dev-a", status: "connected", changed: true, warning: null }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const harness = createContext(dataDir);
  t.after(async () => {
    for (const timer of harness.intervals) nodeClearInterval(timer);
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });

  apply(harness.ctx);
  await waitFor(() => harness.publications.length > 0);
  await writeDiscovery(file, baseUrl, "token-one");
  assert.equal((await harness.handlers.get(METHODS.refresh)()).data.status, "ready");

  const cases = [
    [401, "unauthorized", "unauthorized"],
    [404, "device_not_found", "device_not_found"],
    [409, "operation_conflict", "operation_failed"],
    [409, "device_unavailable", "device_unavailable"],
    [422, "operation_failed", "operation_failed"],
    [429, "rate_limited", "service_unavailable"],
    [500, "internal_error", "service_unavailable"],
    [418, "teapot", "operation_failed"],
  ];
  for (const [status, code, expected] of cases) {
    actionStatus = status;
    actionCode = code;
    const result = await harness.handlers.get(METHODS.connect)({ deviceId: "dev-a" });
    assert.deepEqual(result, { ok: false, code: expected });
  }

  stateStatus = 500;
  const unavailable = await harness.handlers.get(METHODS.refresh)();
  assert.equal(unavailable.data.status, "offline");
  assert.equal(unavailable.data.error, "service_unavailable");

  stateStatus = 401;
  const unauthorized = await harness.handlers.get(METHODS.refresh)();
  assert.equal(unauthorized.data.status, "unauthorized");
  assert.equal(unauthorized.data.error, "unauthorized");
  stateStatus = 200;
  const recovered = await harness.handlers.get(METHODS.refresh)();
  assert.equal(recovered.data.status, "ready");
});
