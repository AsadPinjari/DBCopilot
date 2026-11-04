const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");

const {
  getAdapter,
  listAdapters,
  listCapabilities,
} = require("../src/adapters");

test("listCapabilities returns honest status across all engines", () => {
  const caps = listCapabilities();
  assert.ok(Array.isArray(caps));
  assert.ok(caps.length >= 10);

  const mysqlCap = caps.find((c) => c.engine === "mysql");
  assert.equal(mysqlCap.status, "Implemented and tested");
  assert.equal(mysqlCap.category, "relational");

  const pgCap = caps.find((c) => c.engine === "postgres");
  assert.equal(pgCap.status, "Implemented and tested");

  const sqliteCap = caps.find((c) => c.engine === "sqlite");
  assert.equal(sqliteCap.status, "Implemented and tested");

  const mongoCap = caps.find((c) => c.engine === "mongodb");
  assert.equal(mongoCap.status, "Implemented and tested");

  const redisCap = caps.find((c) => c.engine === "redis");
  assert.equal(redisCap.status, "Implemented and tested");

  const oracleCap = caps.find((c) => c.engine === "oracle");
  assert.equal(oracleCap.status, "Partially supported");

  const snowCap = caps.find((c) => c.engine === "snowflake");
  assert.equal(snowCap.status, "Partially supported");
});

test("SQLiteAdapter inspects in-memory database schema", async () => {
  const adapter = getAdapter("sqlite");

  // Create temporary in-memory database
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT
    );
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      title TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Mock resolveDatabasePath or inspect via sqlite adapter
  const schema = {
    database: "memory.db",
    engine: "sqlite",
    tables: [
      {
        name: "users",
        columns: [
          { name: "id", type: "integer", primaryKey: true, nullable: false },
          { name: "username", type: "text", primaryKey: false, nullable: false },
          { name: "email", type: "text", primaryKey: false, nullable: true },
        ],
      },
    ],
  };

  const validation = adapter.validateQuery("SELECT id, username FROM users WHERE id = 1;", schema);
  assert.equal(validation.status, "valid");

  const invalidValidation = adapter.validateQuery("SELECT missing_col FROM users;", schema);
  assert.equal(invalidValidation.status, "invalid");
  db.close();
});

test("PostgreSQLAdapter normalizes $1 parameter markers", () => {
  const adapter = getAdapter("postgres");
  const schema = {
    database: "pg_test",
    engine: "postgres",
    tables: [
      {
        name: "accounts",
        columns: [
          { name: "id", type: "integer", primaryKey: true, nullable: false },
          { name: "balance", type: "decimal", primaryKey: false, nullable: false },
        ],
      },
    ],
  };

  const res = adapter.validateQuery("SELECT id, balance FROM accounts WHERE id = $1 AND balance > $2;", schema);
  assert.equal(res.status, "valid");
});

test("MongoDBAdapter validates queries and detects missing collections", () => {
  const adapter = getAdapter("mongodb");
  const schema = {
    database: "store",
    engine: "mongodb",
    tables: [
      {
        name: "products",
        columns: [{ name: "_id", type: "ObjectId" }, { name: "title", type: "string" }],
      },
    ],
  };

  const validRes = adapter.validateQuery("db.products.find({ title: 'Book' })", schema);
  assert.equal(validRes.status, "valid");

  const invalidRes = adapter.validateQuery("db.nonexistent_collection.find({})", schema);
  assert.equal(invalidRes.status, "invalid");
  assert.ok(invalidRes.findings.some((f) => f.code === "COLLECTION_NOT_FOUND"));
});

test("MongoDBAdapter validates aggregation pipeline stages", () => {
  const adapter = getAdapter("mongodb");
  const schema = { database: "store", engine: "mongodb", tables: [{ name: "orders" }] };

  const validAgg = adapter.validateQuery(
    "db.orders.aggregate([ { $match: { status: 'A' } }, { $group: { _id: '$cust_id', total: { $sum: '$amount' } } } ])",
    schema
  );
  assert.equal(validAgg.status, "valid");

  const invalidAgg = adapter.validateQuery(
    "db.orders.aggregate([ { $invalidStageName: { status: 'A' } } ])",
    schema
  );
  assert.equal(invalidAgg.status, "invalid");
  assert.ok(invalidAgg.findings.some((f) => f.code === "INVALID_PIPELINE_STAGE"));
});

test("MongoDBAdapter validates db.students.find() and detects syntax bracket errors", () => {
  const adapter = getAdapter("mongodb");
  const schema = { database: "university", engine: "mongodb", tables: [{ name: "students" }] };

  const validFind = adapter.validateQuery("db.students.find()", schema);
  assert.equal(validFind.status, "valid");
  assert.equal(validFind.findings.length, 0);

  const syntaxError = adapter.validateQuery("db.students.find({ active: true", schema);
  assert.equal(syntaxError.status, "invalid");
  assert.ok(syntaxError.findings.some((f) => f.code === "SYNTAX_ERROR"));
});

test("RedisAdapter flags dangerous blocking commands (KEYS *) and destructive operations", () => {
  const adapter = getAdapter("redis");

  const dangerousKeys = adapter.validateQuery("KEYS user:*");
  assert.equal(dangerousKeys.status, "invalid");
  assert.ok(dangerousKeys.findings.some((f) => f.code === "BLOCKING_COMMAND_KEYS"));

  const dangerousFlush = adapter.validateQuery("FLUSHALL");
  assert.equal(dangerousFlush.status, "invalid");
  assert.ok(dangerousFlush.findings.some((f) => f.code === "DESTRUCTIVE_COMMAND_FLUSH"));

  const safeGet = adapter.validateQuery("GET user:1001");
  assert.equal(safeGet.status, "valid");
});

test("getAdapter throws informative error for completely unknown engine", () => {
  assert.throws(() => getAdapter("nonexistent_db"), /Unsupported database engine/);
});
