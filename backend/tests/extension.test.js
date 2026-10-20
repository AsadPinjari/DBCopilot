const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const express = require("express");
const extensionRoutes = require("../src/routes/extension.routes");

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/extension", extensionRoutes);
  return app;
}

test("GET /api/extension/info returns metadata and download endpoint", async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/extension/info`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.available, true);
    assert.strictEqual(data.filename, "dbcopilot-1.0.0.vsix");
    assert.strictEqual(data.version, "1.0.0");
    assert.strictEqual(data.downloadUrl, "/api/extension/download");
    assert.ok(data.sizeBytes > 0);
    assert.ok(Array.isArray(data.commands));
    assert.ok(Array.isArray(data.settings));
  } finally {
    server.close();
  }
});

test("GET /api/extension/download streams the verified VSIX archive", async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/extension/download`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("content-type"), "application/vnd.code.vsix");
    assert.ok(res.headers.get("content-disposition").includes('filename="dbcopilot-1.0.0.vsix"'));

    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 20000);
  } finally {
    server.close();
  }
});
