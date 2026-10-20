const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");

const sqlRoutes = require("../src/routes/sql.routes");
const { createSession } = require("../src/services/session.service");

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/sql", sqlRoutes);
  return app;
}

function makeRequest(app, method, path, body) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const payload = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method,
          headers: {
            "Content-Type": "application/json",
            ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            server.close();
            try {
              resolve({
                statusCode: res.statusCode,
                body: data ? JSON.parse(data) : null,
              });
            } catch (err) {
              resolve({ statusCode: res.statusCode, rawBody: data });
            }
          });
        }
      );
      req.on("error", (err) => {
        server.close();
        reject(err);
      });
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  });
}

test("POST /api/sql/validate returns 400 when sessionId is missing", async () => {
  const app = createApp();
  const res = await makeRequest(app, "POST", "/api/sql/validate", {
    sql: "SELECT 1;",
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /sessionId/i);
});

test("POST /api/sql/validate returns 400 when sql is missing or empty", async () => {
  const app = createApp();
  const res = await makeRequest(app, "POST", "/api/sql/validate", {
    sessionId: "some-session-id",
    sql: "   ",
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /SQL query/i);
});

test("POST /api/sql/validate returns 400 when sql exceeds 10,000 characters", async () => {
  const app = createApp();
  const res = await makeRequest(app, "POST", "/api/sql/validate", {
    sessionId: "some-session-id",
    sql: "SELECT " + "a".repeat(10001),
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /too long/i);
});

test("POST /api/sql/validate returns 401 when sessionId is not found or expired", async () => {
  const app = createApp();
  const res = await makeRequest(app, "POST", "/api/sql/validate", {
    sessionId: "non-existent-session",
    sql: "SELECT 1;",
  });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /expired/i);
});

const { validateSelectQuery } = require("../src/services/sql-validation.service");

test("validateSelectQuery automatically strips outer programming quotes", () => {
  const schema = {
    tables: [
      {
        name: "students",
        columns: [{ name: "id" }, { name: "name" }, { name: "email" }],
      },
    ],
  };

  const quotedSql = '  "SELECT id, name, gpa FROM students WHERE id = 1;"  ';
  const result = validateSelectQuery(quotedSql, schema);
  assert.strictEqual(result.status, "invalid");
  assert.ok(result.findings.some((f) => f.message.includes("gpa")));
});
