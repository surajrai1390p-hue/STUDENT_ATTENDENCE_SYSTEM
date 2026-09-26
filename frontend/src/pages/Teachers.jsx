/**
 * ============================================================
 *  TEACHERS.JSX — Create / delete teacher logins (admin only)
 * ============================================================
 *  This page exists because teachers need accounts to log in.
 *  The form POSTs { name, email, password } → the backend
 *  bcrypt-hashes the password before storing it.
 *
 *  Route is double-protected:
 *    1. Client: <Guard roles={['admin']}> in App.jsx
 *    2. Server: router.use(requireRole('admin')) in routes/teachers.js
 * ============================================================
 */
import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useToast } from '../ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { EmptyIcon, UsersIcon } from '../components/Icons';

const EMPTY = { name: '', email: '', password: '' };

export default function Teachers() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setList((await api.get('/teachers')).data);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to load teachers'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setFormErr('');
    setBusy(true);
    try {
      await api.post('/teachers', form);
      toast.success(`${form.name} added as teacher`);
      setForm(EMPTY);
      load();
    } catch (err) {
      setFormErr(errMsg(err, 'Could not add teacher'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/teachers/${toDelete.id}`);
      toast.success('Teacher deleted');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Delete failed'));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">
            {list.length} teacher{list.length !== 1 ? 's' : ''} can mark attendance
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Add teacher</div>
        <div className="card-desc">New teachers get their own login credentials</div>
        {formErr && <div className="alert alert-error">{formErr}</div>}
        <form onSubmit={add}>
          <div className="form-row">
            <div className="field">
              <label className="label">Full name</label>
              <input
                className="input"
                required
                placeholder="e.g. Prof. Meera Joshi"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                placeholder="teacher@college.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Adding…' : '+ Add Teacher'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '8px 0 16px' }}>
            {[1, 2].map((i) => (
              <div className="skeleton skeleton-row" key={i} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <EmptyIcon>
              <UsersIcon />
            </EmptyIcon>
            <div className="empty-title">No teachers yet</div>
            <div className="empty-desc">Add your first teacher above.</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td className="cell-main">{t.name}</td>
                    <td className="cell-sub">{t.email}</td>
                    <td>
                      <span className="badge badge-indigo">{t.role}</span>
                    </td>
                    <td className="cell-sub">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => setToDelete(t)}>
                        Delete
                      </button>
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
          title="Delete teacher?"
          message={`"${toDelete.name}" will lose access to the system immediately.`}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
