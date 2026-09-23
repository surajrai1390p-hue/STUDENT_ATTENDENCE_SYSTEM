-- STUDENT ATTENDANCE SYSTEM | MySQL Workbench
-- Create DB: CREATE DATABASE attendance_db; then open this file and run (Ctrl+Shift+Enter)
CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','teacher') NOT NULL DEFAULT 'teacher',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roll_no VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  class_name VARCHAR(50) NOT NULL DEFAULT 'FY-BCA',
  email VARCHAR(150) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  teacher_id INT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('Present','Absent') NOT NULL DEFAULT 'Present',
  marked_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_att (student_id, subject_id, date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Demo subjects (teacher assigned later from UI)
INSERT INTO subjects (code, name) VALUES
('CS101','Programming in C'),
('CS102','Web Technologies'),
('CS103','DBMS')
ON DUPLICATE KEY UPDATE name=VALUES(name);
