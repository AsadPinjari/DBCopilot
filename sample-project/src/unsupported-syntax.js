// Scenario C: Queries using unsupported SQL constructs (UNION, etc.)
const mysql = require("mysql2/promise");

async function getCombinedRoster(pool) {
  // Query with UNION: Validator reports status: "unsupported" (requires manual review)
  const [results] = await pool.query(
    "SELECT id FROM students UNION SELECT id FROM courses;"
  );

  return results;
}

module.exports = { getCombinedRoster };
