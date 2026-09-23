// Seeds demo users, students and ~6 weeks of attendance. Run: npm run seed
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

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
  const adminHash = await bcrypt.hash('admin123', 10);
  const teacherHash = await bcrypt.hash('teacher123', 10);

  await pool.query(
    `INSERT INTO users (name,email,password_hash,role) VALUES
     ('Admin','admin@college.edu',?,'admin'),
     ('Demo Teacher','teacher@college.edu',?,'teacher')
     ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    [adminHash, teacherHash]
  );

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

  const [[teacher]] = await pool.query(
    "SELECT id FROM users WHERE email='teacher@college.edu'"
  );
  await pool.query(
    'UPDATE subjects SET teacher_id=? WHERE teacher_id IS NULL',
    [teacher.id]
  );

  const [[{ sid: studentCount }]] = await pool.query(
    'SELECT COUNT(*) AS sid FROM students'
  );
  const [subjects] = await pool.query('SELECT id FROM subjects');
  const [students] = await pool.query('SELECT id FROM students');

  if (studentCount > 0 && subjects.length > 0) {
    const today = new Date();
    const records = [];
    // Last 40 weekdays of attendance so reports/defaulters have real data
    for (let d = 40; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      if (date.getDay() === 0) continue; // skip Sundays
      const dateStr = date.toISOString().slice(0, 10);
      for (const sub of subjects) {
        for (const st of students) {
          // deterministic pseudo-random ~80% presence, some students weaker
          const seed = (st.id * 31 + sub.id * 17 + d * 7) % 100;
          const threshold = st.id % 4 === 0 ? 65 : 85;
          const status = seed < threshold ? 'Present' : 'Absent';
          records.push([st.id, sub.id, dateStr, status, teacher.id]);
        }
      }
    }
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
