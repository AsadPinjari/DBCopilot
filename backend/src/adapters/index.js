const MySQLAdapter = require("./mysql.adapter");
const PostgreSQLAdapter = require("./postgres.adapter");
const SQLiteAdapter = require("./sqlite.adapter");
const MongoDBAdapter = require("./mongodb.adapter");
const RedisAdapter = require("./redis.adapter");
const { createStubs } = require("./stubs");

const adapters = new Map();

// Register primary implemented and tested adapters
const mysql = new MySQLAdapter("mysql", "MySQL");
const mariadb = new MySQLAdapter("mariadb", "MariaDB");
const postgres = new PostgreSQLAdapter();
const sqlite = new SQLiteAdapter();
const mongodb = new MongoDBAdapter();
const redis = new RedisAdapter();

adapters.set("mysql", mysql);
adapters.set("mariadb", mariadb);
adapters.set("postgres", postgres);
adapters.set("postgresql", postgres);
adapters.set("sqlite", sqlite);
adapters.set("sqlite3", sqlite);
adapters.set("mongodb", mongodb);
adapters.set("mongo", mongodb);
adapters.set("redis", redis);

// Register stubs for secondary and planned engines
for (const stub of createStubs()) {
  adapters.set(stub.engine, stub);
}

function getAdapter(engine = "mysql") {
  const normalized = String(engine).trim().toLowerCase();
  const adapter = adapters.get(normalized);

  if (!adapter) {
    throw new Error(
      `Unsupported database engine "${engine}". Supported engines: mysql, mariadb, postgres, sqlite, mongodb, redis, sqlserver, oracle, cassandra, neo4j, snowflake, redshift, bigquery.`
    );
  }

  return adapter;
}

function listAdapters() {
  const seen = new Set();
  const list = [];

  for (const adapter of adapters.values()) {
    if (!seen.has(adapter.engine)) {
      seen.add(adapter.engine);
      list.push(adapter);
    }
  }

  return list;
}

function listCapabilities() {
  return listAdapters().map((adapter) => adapter.getCapabilities());
}

module.exports = {
  getAdapter,
  listAdapters,
  listCapabilities,
};
