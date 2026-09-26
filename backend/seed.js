/**
 * ============================================================
 *  SEED.JS — One-command demo data generator (npm run seed)
 * ============================================================
 *  Creates:
 *   1. Admin + demo teacher logins (passwords are bcrypt-hashed)
 *   2. 8 students across FY-BCA / SY-BCA / TY-BCA
 *   3. Assigns the demo teacher to all subjects
 *   4. ~40 weekdays of attendance (skips Sundays) so the
 *      Reports page and dashboard charts show real data instantly
 *
 *  Deterministic pattern (no Math.random): the same formula is
 *  used every run, so demo data is reproducible during the viva.
 * ============================================================
 */
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

// roll_no, name, class — three classes only
const STUDENTS = [
  ['101', 'Aarav Sharma', 'FY-BCA'],
  ['102', 'Diya Patel', 'FY-BCA'],
  ['103', 'Rohan Verma', 'FY-BCA'],
  ['104', 'Ananya Iyer', 'SY-BCA'],
  ['105', 'Kabir Singh', 'SY-BCA'],
  ['106', 'Ishita Rao', 'SY-BCA'],
  ['107', 'Arjun Nair', 'TY-BCA'],
  ['108', 'Sara Khan', 'TY-BCA']
];

(async () => {
  // ---- 1. Users (ON DUPLICATE KEY = safe to re-run the seed) ----
  const adminHash = await bcrypt.hash('admin123', 10);
  const teacherHash = await bcrypt.hash('teacher123', 10);

  await pool.query(
    `INSERT INTO users (name,email,password_hash,role) VALUES
     ('Admin','admin@college.edu',?,'admin'),
     ('Demo Teacher','teacher@college.edu',?,'teacher')
     ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    [adminHash, teacherHash]
  );

  // ---- 2. Students (INSERT IGNORE skips duplicates by roll_no) ----
  await pool.query(
    `INSERT IGNORE INTO students (roll_no,name,class_name) VALUES ${STUDENTS.map(
      () => '(?,?,?)'
    ).join(',')}`,
    STUDENTS.flat()
  );

  // Keep demo students on the three canonical classes
  await pool.query(
    `UPDATE students SET class_name = CASE roll_no
       WHEN '101' THEN 'FY-BCA' WHEN '102' THEN 'FY-BCA' WHEN '103' THEN 'FY-BCA'
       WHEN '104' THEN 'SY-BCA' WHEN '105' THEN 'SY-BCA' WHEN '106' THEN 'SY-BCA'
       WHEN '107' THEN 'TY-BCA' WHEN '108' THEN 'TY-BCA'
       ELSE class_name END
     WHERE roll_no IN ('101','102','103','104','105','106','107','108')`
  );

  // ---- 3. Assign the demo teacher to every subject ----
  const [[teacher]] = await pool.query(
    "SELECT id FROM users WHERE email='teacher@college.edu'"
  );
  await pool.query(
    'UPDATE subjects SET teacher_id=? WHERE teacher_id IS NULL',
    [teacher.id]
  );

  // ---- 4. Generate attendance for the last 40 weekdays ----
  const [[{ sid: studentCount }]] = await pool.query(
    'SELECT COUNT(*) AS sid FROM students'
  );
  const [subjects] = await pool.query('SELECT id FROM subjects');
  const [students] = await pool.query('SELECT id FROM students');

  if (studentCount > 0 && subjects.length > 0) {
    const today = new Date();
    const records = [];
    for (let d = 40; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      if (date.getDay() === 0) continue; // Sunday = holiday
      const dateStr = date.toISOString().slice(0, 10);
      for (const sub of subjects) {
        for (const st of students) {
          // Pseudo-random but reproducible: same ids + day → same status.
          // Every 4th student is weaker (threshold 65%) so the
          // defaulters list (<75%) always has entries for the demo.
          const seed = (st.id * 31 + sub.id * 17 + d * 7) % 100;
          const threshold = st.id % 4 === 0 ? 65 : 85;
          const status = seed < threshold ? 'Present' : 'Absent';
          records.push([st.id, sub.id, dateStr, status, teacher.id]);
        }
      }
    }
    // Insert in batches of 500 to keep SQL statements a reasonable size
    for (let i = 0; i < records.length; i += 500) {
      await pool.query(
        `INSERT IGNORE INTO attendance (student_id,subject_id,date,status,marked_by)
         VALUES ${records
           .slice(i, i + 500)
           .map(() => '(?,?,?,?,?)')
           .join(',')}`,
        records.slice(i, i + 500).flat()
      );
    }
    console.log(`Seeded ${records.length} attendance records (last 40 weekdays)`);
  }

  console.log('Seeded: admin@college.edu/admin123, teacher@college.edu/teacher123');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
