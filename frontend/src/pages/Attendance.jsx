/**
 * ============================================================
 *  ATTENDANCE.JSX — Core screen: teachers mark daily P/A
 * ============================================================
 *  How it works:
 *   1. Subject + date selected → useEffect auto-loads the class list
 *   2. GET /students  → full class list
 *   3. GET /attendance?subject_id=&date= → already-saved marks (if any)
 *   4. Frontend MERGES both: saved status wins, default = "Present"
 *   5. Teacher toggles P/A per student (or "Mark all")
 *   6. POST /attendance/mark → one transaction saves the whole sheet
 *
 *  Why auto-load on subject/date change?
 *  The effect depends on [subjectId, date] — switching either
 *  one refetches, so the teacher can never see a stale list.
 * ============================================================
 */
import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useToast } from '../ToastContext';
import { EmptyIcon, ClipIcon, UsersIcon } from '../components/Icons';

const today = () => new Date().toISOString().slice(0, 10);

export default function Attendance() {
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/subjects')
      .then((r) => {
        setSubjects(r.data);
        setSubjectId((prev) => prev || r.data[0]?.id || '');
      })
      .catch((e) => toast.error(errMsg(e, 'Failed to load subjects')));
  }, []);

  // Whenever subject OR date changes → reload the student list
  useEffect(() => {
    if (subjectId) load();
  }, [subjectId, date]);

  // Merges /students with /attendance for the chosen date
  // Build a lookup {student_id: status} from saved records,
  // then default any student not yet marked today to "Present"
  const load = async () => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const students = (await api.get('/students')).data;
      let marked = [];
      try {
        marked = (await api.get('/attendance', { params: { subject_id: subjectId, date } })).data;
      } catch {
        marked = [];
      }
      const map = Object.fromEntries(marked.map((m) => [m.student_id, m.status]));
      setRows(students.map((s) => ({ ...s, status: map[s.id] || 'Present' })));
      setLoaded(true);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to load students'));
    } finally {
      setLoading(false);
    }
  };

  // Toggle a single student's status (immutable state update)
  const setStatus = (id, status) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));

  // Bulk action: set every row to Present or Absent
  const markAll = (status) => setRows((r) => r.map((x) => ({ ...x, status })));

  // Send the whole sheet — backend wraps it in a DB transaction
  const save = async () => {
    if (!rows.length) return;
    setSaving(true);
    try {
      await api.post('/attendance/mark', {
        subject_id: subjectId,
        date,
        records: rows.map((r) => ({ student_id: r.id, status: r.status }))
      });
      toast.success(`Attendance saved for ${rows.length} students`);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to save attendance'));
    } finally {
      setSaving(false);
    }
  };

  const present = rows.filter((r) => r.status === 'Present').length;
  const absent = rows.length - present;
  const subject = subjects.find((s) => String(s.id) === String(subjectId));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mark Attendance</h1>
          <p className="page-subtitle">
            Pick a subject and date — the student list loads automatically
          </p>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="field" style={{ minWidth: 240 }}>
            <label className="label">Subject</label>
            <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.length === 0 && <option value="">No subjects available</option>}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button className="btn btn-outline" onClick={load} disabled={loading}>
              Reload
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !rows.length || !loaded}
            >
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        </div>

        {!loaded && !loading && (
          <div className="empty-state">
            <EmptyIcon>
              <ClipIcon />
            </EmptyIcon>
            <div className="empty-title">Select a subject to begin</div>
            <div className="empty-desc">The student list will load automatically</div>
          </div>
        )}

        {loading && (
          <div style={{ padding: '8px 0 16px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div className="skeleton skeleton-row" key={i} />
            ))}
          </div>
        )}

        {loaded && !loading && rows.length === 0 && (
          <div className="empty-state">
            <EmptyIcon>
              <UsersIcon />
            </EmptyIcon>
            <div className="empty-title">No students enrolled</div>
            <div className="empty-desc">Add students first from the Students page.</div>
          </div>
        )}

        {loaded && !loading && rows.length > 0 && (
          <>
            <div className="summary-pills">
              <span className="pill">
                <strong>{rows.length}</strong> students
              </span>
              <span className="pill" style={{ background: 'var(--success-soft)', borderColor: '#bbf7d0', color: 'var(--success)' }}>
                <strong>{present}</strong> present
              </span>
              <span className="pill" style={{ background: 'var(--danger-soft)', borderColor: '#fecaca', color: 'var(--danger)' }}>
                <strong>{absent}</strong> absent
              </span>
              <span className="pill">
                {subject?.code} · {date}
              </span>
            </div>

            <div className="form-actions" style={{ marginBottom: 14 }}>
              <button className="btn btn-outline btn-sm" onClick={() => markAll('Present')}>
                ✓ Mark all Present
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => markAll('Absent')}>
                ✕ Mark all Absent
              </button>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>Roll No</th>
                    <th>Student</th>
                    <th>Class</th>
                    <th style={{ width: 200 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="cell-sub">{i + 1}</td>
                      <td>
                        <span className="badge badge-indigo">{r.roll_no}</span>
                      </td>
                      <td className="cell-main">{r.name}</td>
                      <td className="cell-sub">{r.class_name}</td>
                      <td>
                        <div className="toggle-group">
                          <button
                            className={`toggle-btn ${r.status === 'Present' ? 'on-present' : ''}`}
                            onClick={() => setStatus(r.id, 'Present')}
                          >
                            P
                          </button>
                          <button
                            className={`toggle-btn ${r.status === 'Absent' ? 'on-absent' : ''}`}
                            onClick={() => setStatus(r.id, 'Absent')}
                          >
                            A
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
