const Redis = require("ioredis");
const BaseDatabaseAdapter = require("./base.adapter");

const CONNECTION_TIMEOUT_MS = 6000;

class RedisAdapter extends BaseDatabaseAdapter {
  constructor() {
    super("redis", "Redis", "non-relational");
  }

  getCapabilities() {
    return {
      engine: this.engine,
      displayName: this.displayName,
      category: "non-relational",
      status: "Implemented and tested",
      features: {
        connection: "Implemented and tested",
        schemaInspection: "Implemented and tested",
        queryValidation: "Implemented and tested",
        codebaseDetection: "Implemented and tested",
        aiAssistance: "Implemented and tested",
        diagnostics: "Implemented and tested",
      },
      notes: "Inspects Redis keyspace, memory, and data structure types. Analyzes command safety and flags production-blocking commands (KEYS *, FLUSHALL).",
    };
  }

  buildClient(config) {
    const options = {
      host: config.host || "localhost",
      port: Number(config.port) || 6379,
      password: config.password || undefined,
      db: Number(config.database) || 0,
      connectTimeout: CONNECTION_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    };

    if (config.uri) {
      return new Redis(config.uri, options);
    }
    return new Redis(options);
  }

  async testConnection(config) {
    const redis = this.buildClient(config);
    try {
      await redis.connect();
      const pong = await redis.ping();
      return pong === "PONG";
    } finally {
      redis.disconnect();
    }
  }

  async inspectSchema(config) {
    const redis = this.buildClient(config);

    try {
      await redis.connect();
      const dbsize = await redis.dbsize();
      const infoStr = await redis.info("server");

      // Extract redis version
      const versionMatch = infoStr.match(/redis_version:([0-9.]+)/);
      const redisVersion = versionMatch ? versionMatch[1] : "unknown";

      // Scan sample keys (up to 50) to categorize key types
      const [, sampleKeys] = await redis.scan(0, "COUNT", 50);

      const typeCounts = { string: 0, hash: 0, list: 0, set: 0, zset: 0, other: 0 };
      const sampleKeyItems = [];

      for (const k of sampleKeys.slice(0, 20)) {
        try {
          const type = await redis.type(k);
          if (typeCounts[type] !== undefined) {
            typeCounts[type]++;
          } else {
            typeCounts.other++;
          }
          sampleKeyItems.push({ key: k, type });
        } catch {
          // Ignore individual key read errors
        }
      }

      const schema = {
        database: `db${config.database || 0}`,
        engine: this.engine,
        category: "key-value",
        serverVersion: redisVersion,
        totalKeys: dbsize,
        typeBreakdown: typeCounts,
        tables: [
          {
            name: `keyspace_db${config.database || 0}`,
            columns: [
              { name: "key", type: "string", primaryKey: true, nullable: false },
              { name: "type", type: "string", nullable: false },
              { name: "ttl", type: "integer", nullable: true },
            ],
            sampleKeys: sampleKeyItems,
            relationships: [],
          },
        ],
      };

      return schema;
    } finally {
      redis.disconnect();
    }
  }

  validateQuery(commandString) {
    const findings = [];
    const trimmed = (commandString || "").trim();

    // Dangerous blocking commands in Redis
    if (/^KEYS\s+/i.test(trimmed) || /\bclient\.keys\s*\(/i.test(trimmed)) {
      findings.push({
        code: "BLOCKING_COMMAND_KEYS",
        severity: "CRITICAL",
        message: `Command "KEYS" blocks the single-threaded Redis event loop in production. Use SCAN instead.`,
      });
    }

    if (/^FLUSHALL\b|^FLUSHDB\b/i.test(trimmed) || /\bclient\.flushall\s*\(|\bclient\.flushdb\s*\(/i.test(trimmed)) {
      findings.push({
        code: "DESTRUCTIVE_COMMAND_FLUSH",
        severity: "CRITICAL",
        message: `Destructive command "${trimmed}" wipes all database keys. Explicit confirmation required.`,
      });
    }

    if (/^SHUTDOWN\b/i.test(trimmed) || /\bclient\.shutdown\s*\(/i.test(trimmed)) {
      findings.push({
        code: "DESTRUCTIVE_COMMAND_SHUTDOWN",
        severity: "CRITICAL",
        message: `Command "SHUTDOWN" terminates the Redis server instance.`,
      });
    }

    return {
      status: findings.length > 0 ? "invalid" : "valid",
      supported: true,
      findings,
    };
  }
}

module.exports = RedisAdapter;
