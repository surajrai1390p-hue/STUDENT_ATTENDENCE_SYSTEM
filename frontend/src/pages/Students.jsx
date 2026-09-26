/**
 * ============================================================
 *  STUDENTS.JSX — Student list + add/delete (admin)
 * ============================================================
 *  Features:
 *   - Client-side SEARCH: the API returns everyone once, then
 *     .filter() narrows the list as you type (no extra requests)
 *   - Add form visible only to admin (role check → user.role)
 *   - Delete opens a ConfirmModal (prevents accidental deletes)
 *   - Skeleton rows while the list loads
 *
 *  State pattern used on every CRUD page in this project:
 *   list + loading + form fields + error, with a shared load().
 * ============================================================
 */
import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { EmptyIcon, UsersIcon } from '../components/Icons';

const EMPTY = { roll_no: '', name: '', class_name: 'FY-BCA', email: '' };
const CLASSES = ['FY-BCA', 'SY-BCA', 'TY-BCA'];

export default function Students() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [toDelete, setToDelete] = useState(null);

  // Fetch the full list — called on mount and after every add/delete
  const load = async () => {
    setLoading(true);
    try {
      setList((await api.get('/students')).data);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to load students'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // POST /api/students — form submit (admin only, enforced by API too)
  const add = async (e) => {
    e.preventDefault();
    setFormErr('');
    setBusy(true);
    try {
      await api.post('/students', {
        ...form,
        email: form.email || null
      });
      toast.success(`Student ${form.name} added`);
      setForm(EMPTY);
      load();
    } catch (err) {
      setFormErr(errMsg(err, 'Could not add student'));
    } finally {
      setBusy(false);
    }
  };

  // DELETE /api/students/:id — runs only after ConfirmModal confirmation
  const remove = async () => {
    try {
      await api.delete(`/students/${toDelete.id}`);
      toast.success('Student deleted');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Delete failed'));
    }
  };

  const filtered = list.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_no.toLowerCase().includes(search.toLowerCase()) ||
      s.class_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">
            {list.length} enrolled student{list.length !== 1 ? 's' : ''} across all classes
          </p>
        </div>
        <input
          className="input"
          style={{ maxWidth: 260 }}
          placeholder="Search by roll, name, class…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isAdmin && (
        <div className="card">
          <div className="card-title">Add student</div>
          <div className="card-desc">Only admins can enrol new students</div>
          {formErr && <div className="alert alert-error">{formErr}</div>}
          <form onSubmit={add}>
            <div className="form-row">
              <div className="field">
                <label className="label">Roll number</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. 104"
                  value={form.roll_no}
                  onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">Full name</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Ananya Iyer"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">Class</label>
                <select
                  className="select"
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                >
                  {CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Email (optional)</label>
                <input
                  className="input"
                  type="email"
                  placeholder="student@college.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Adding…' : '+ Add Student'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '8px 0 16px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div className="skeleton skeleton-row" key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <EmptyIcon>
              <UsersIcon />
            </EmptyIcon>
            <div className="empty-title">
              {search ? 'No students match your search' : 'No students yet'}
            </div>
            <div className="empty-desc">
              {search ? 'Try a different roll number or name.' : 'Add your first student above.'}
            </div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="badge badge-indigo">{s.roll_no}</span>
                    </td>
                    <td className="cell-main">{s.name}</td>
                    <td>
                      <span className="badge badge-gray">{s.class_name}</span>
                    </td>
                    <td className="cell-sub">{s.email || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {isAdmin && (
                        <button className="btn btn-danger btn-sm" onClick={() => setToDelete(s)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmModal
          title="Delete student?"
          message={`"${toDelete.name}" (roll ${toDelete.roll_no}) and all their attendance records will be permanently removed.`}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
