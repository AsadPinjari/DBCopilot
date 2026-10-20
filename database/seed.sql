-- =============================================================================
-- DB Copilot — Demo Database Seed Script
-- =============================================================================

CREATE DATABASE IF NOT EXISTS ordermng;
USE ordermng;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  legacy_phone VARCHAR(50) NULL,
  department_id INT,
  CONSTRAINT fk_students_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_name VARCHAR(150) NOT NULL,
  department_id INT,
  CONSTRAINT fk_courses_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB;

-- 5. Seed Initial Data
INSERT INTO departments (id, name) VALUES
  (1, 'Computer Science'),
  (2, 'Mathematics'),
  (3, 'Physics')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO students (id, name, email, legacy_phone, department_id) VALUES
  (1, 'Alice Smith', 'alice@university.edu', '+1-555-0101', 1),
  (2, 'Bob Johnson', 'bob@university.edu', '+1-555-0102', 2),
  (3, 'Carol Williams', 'carol@university.edu', NULL, 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO courses (id, course_name, department_id) VALUES
  (101, 'Introduction to Databases', 1),
  (102, 'Discrete Mathematics', 2),
  (103, 'Algorithms & Data Structures', 1)
ON DUPLICATE KEY UPDATE course_name=VALUES(course_name);

INSERT INTO orders (id, user_id, total, status) VALUES
  (1, 1, 149.99, 'completed'),
  (2, 2, 89.50, 'completed'),
  (3, 1, 29.99, 'pending')
ON DUPLICATE KEY UPDATE total=VALUES(total);
