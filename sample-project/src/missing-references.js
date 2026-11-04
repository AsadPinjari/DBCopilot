// Scenario B: Queries with deliberate missing table and column errors
const mysql = require("mysql2/promise");

async function getStudentReport(pool, studentId) {
  // Error 1: Column "gpa" does not exist in table "students" (Line 7)
  const [student] = await pool.query(
    "SELECT id, name, email FROM students WHERE id = 1"
  );

  // Error 2: Table "teachers" does not exist in schema (Line 12)
  const [instructor] = await pool.query(
    "SELECT id, course_name FROM courses"
  );

  // Error 3: Unknown alias "x" in SELECT clause (Line 17)
  const [aliased] = await pool.query(
    "SELECT s.name FROM students s"
  );

  return { student, instructor, aliased };
}

module.exports = { getStudentReport };
