/**
 * BaseDatabaseAdapter
 * Abstract contract that all relational, non-relational, and cloud warehouse database adapters implement.
 */
class BaseDatabaseAdapter {
  constructor(engine, displayName, category) {
    this.engine = engine;
    this.displayName = displayName;
    this.category = category; // 'relational' | 'non-relational' | 'warehouse'
  }

  /**
   * Return structured capability report.
   */
  getCapabilities() {
    throw new Error("getCapabilities() must be implemented by subclass");
  }

  /**
   * Test connection to the database.
   * @param {object} config Connection options
   * @returns {Promise<boolean>} True if reachable, throws error otherwise
   */
  async testConnection(config) {
    throw new Error("testConnection() must be implemented by subclass");
  }

  /**
   * Inspect the live schema or data-model metadata.
   * @param {object} config Connection options
   * @returns {Promise<object>} Standardized schema object
   */
  async inspectSchema(config) {
    throw new Error("inspectSchema() must be implemented by subclass");
  }

  /**
   * Validate a query against the inspected schema.
   * @param {string} query Query string
   * @param {object} schema Standardized schema object
   * @returns {object} Validation result
   */
  validateQuery(query, schema) {
    throw new Error("validateQuery() must be implemented by subclass");
  }

  /**
   * Safely close any active connections or pools.
   * @param {object} config Connection options
   */
  async close(config) {
    // Default no-op for stateless connection adapters
  }

  /**
   * Sanitize error message to prevent credential exposure.
   */
  sanitizeError(error) {
    const message = error.message || String(error);
    return message
      .replace(/password(=|:\s*)[^\s;&]+/gi, "password=***")
      .replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:***@");
  }
}

module.exports = BaseDatabaseAdapter;
