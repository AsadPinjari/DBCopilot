const { getAdapter } = require("../adapters");

const CONNECTION_TIMEOUT_MS = 10000;

function buildMysqlConfig(config) {
  return {
    host: config.host || "localhost",
    port: Number(config.port) || 3306,
    user: config.username,
    password: config.password,
    database: config.database,
    connectTimeout: CONNECTION_TIMEOUT_MS,
  };
}

async function testDatabaseConnection(config) {
  const engine = config.engine || "mysql";
  const adapter = getAdapter(engine);
  return adapter.testConnection(config);
}

module.exports = {
  testDatabaseConnection,
  buildMysqlConfig,
};