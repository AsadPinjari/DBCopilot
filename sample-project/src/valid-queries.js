// Scenario A: Valid SQL queries matching the live schema
const mysql = require("mysql2/promise");

async function getDepartmentStudents(pool, deptId) {
  // Valid query 1: Simple SELECT with WHERE
  const [students] = await pool.query(
    "SELECT id, name, email, department_id FROM students WHERE department_id = 1;"
  );

  // Valid query 2: COUNT aggregate
  const [count] = await pool.query(
    "SELECT COUNT(*) AS total_students FROM students;"
  );

  // Valid query 3: JOIN with explicit table aliases and qualified columns
  const [roster] = await pool.query(
    "SELECT s.id, s.name, d.name AS dept_name FROM students s JOIN departments d ON s.department_id = d.id;"
  );

  return { students, count, roster };
}

module.exports = { getDepartmentStudents };
