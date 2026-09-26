# AttendPro — Student Attendance System

A full-stack college project (ISA) built with **React + Vite**, **Express**, and **MySQL**.

## Features

- **JWT auth** with two roles — Admin and Teacher
- **Dashboard** with live stats (students, subjects, teachers, today's %)
- **Students** — add / search / delete (admin), view (teacher)
- **Subjects** — manage codes, names and assigned teachers
- **Teachers** — create teacher accounts from the UI (admin)
- **Mark Attendance** — P/A toggles, mark-all, auto-load, same-day edit
- **Reports** — subject-wise %, progress bars, below-75% defaulters, CSV export

## 1. Database (MySQL Workbench)

1. Open Workbench → connect to `localhost` as root
2. Run: `CREATE DATABASE attendance_db;`
3. Open `database/schema.sql` → select `attendance_db` in the schema dropdown → Run (lightning icon)

## 2. Backend

```bash
cd backend
npm install
copy .env.example .env    # then set DB_PASSWORD to your MySQL password
npm run seed              # demo users, students, subjects, sample attendance
npm run dev               # http://localhost:5000/api/health
```

## 3. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

## Demo accounts

| Role    | Email               | Password    |
| ------- | ------------------- | ----------- |
| Admin   | admin@college.edu   | admin123    |
| Teacher | teacher@college.edu | teacher123  |

Click a demo account on the login screen to auto-fill.

## 5-minute demo flow (for ISA presentation)

1. **Login as Admin** → Dashboard shows live stats seeded with sample data
2. **Students** → add a student, search the table
3. **Teachers / Subjects** → create a teacher, assign a subject
4. **Logout → Login as Teacher** → Mark Attendance → pick CS101 + today → toggle P/A → Save
5. **Reports** → pick CS101 + current month → show % bars + defaulters list → Export CSV
6. Show **MySQL Workbench tables** and the **API calls in the Network tab**

## API map (for viva)

| Method | Endpoint                        | Role          |
| ------ | ------------------------------- | ------------- |
| POST   | `/api/auth/login`               | public        |
| GET    | `/api/auth/me`                  | any           |
| GET    | `/api/stats`                    | any           |
| GET/POST/DELETE | `/api/teachers`       | admin         |
| GET/POST/DELETE | `/api/students`       | admin (write) |
| GET/POST/PUT/DELETE | `/api/subjects`   | admin (write) |
| POST   | `/api/attendance/mark`          | admin/teacher |
| GET    | `/api/attendance`               | any           |
| GET    | `/api/attendance/recent`        | any           |
| GET    | `/api/attendance/report`        | any           |
| GET    | `/api/attendance/defaulters`    | any           |

## Project structure

```
ISA_III_PROJECT/
├── backend/
│   ├── config/db.js          # MySQL connection pool
│   ├── middleware/           # JWT auth (verifyToken + requireRole)
│   ├── routes/               # auth, students, teachers, subjects, attendance, stats
│   ├── seed.js               # demo data
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/       # Layout, ConfirmModal
│       ├── pages/            # Login, Dashboard, Students, Subjects, Teachers, Attendance, Reports
│       ├── AuthContext.jsx
│       ├── ToastContext.jsx
│       ├── api.js            # axios instance + interceptors
│       └── styles.css        # design system
└── database/schema.sql
```
