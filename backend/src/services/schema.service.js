const { getAdapter } = require("../adapters");

/**
 * Introspect database schema using the appropriate engine adapter.
 * @param {object} config Database connection configuration
 * @returns {Promise<object>} Standardized schema object
 */
async function getDatabaseSchema(config) {
  const engine = config.engine || "mysql";
  const adapter = getAdapter(engine);
  return adapter.inspectSchema(config);
}

module.exports = {
  getDatabaseSchema,
};