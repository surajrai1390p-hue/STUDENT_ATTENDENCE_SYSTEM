import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { EmptyIcon, BookIcon } from '../components/Icons';

const EMPTY = { code: '', name: '', teacher_id: '' };

export default function Subjects() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.get('/subjects'),
        isAdmin ? api.get('/teachers') : Promise.resolve({ data: [] })
      ]);
      setSubjects(s.data);
      setTeachers(t.data);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to load subjects'));
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
      await api.post('/subjects', {
        ...form,
        teacher_id: form.teacher_id || null
      });
      toast.success(`Subject ${form.code} added`);
      setForm(EMPTY);
      load();
    } catch (err) {
      setFormErr(errMsg(err, 'Could not add subject'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/subjects/${toDelete.id}`);
      toast.success('Subject deleted');
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
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} with teacher assignments
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="card">
          <div className="card-title">Add subject</div>
          <div className="card-desc">Create a subject and optionally assign a teacher</div>
          {formErr && <div className="alert alert-error">{formErr}</div>}
          <form onSubmit={add}>
            <div className="form-row">
              <div className="field">
                <label className="label">Subject code</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. CS104"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">Subject name</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Software Engineering"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">Assigned teacher</label>
                <select
                  className="select"
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                >
                  <option value="">— Unassigned —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Adding…' : '+ Add Subject'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '8px 0 16px' }}>
            {[1, 2, 3].map((i) => (
              <div className="skeleton skeleton-row" key={i} />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="empty-state">
            <EmptyIcon>
              <BookIcon />
            </EmptyIcon>
            <div className="empty-title">No subjects yet</div>
            <div className="empty-desc">Add your first subject above.</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="badge badge-indigo">{s.code}</span>
                    </td>
                    <td className="cell-main">{s.name}</td>
                    <td>
                      {s.teacher_name ? (
                        <span className="badge badge-green">{s.teacher_name}</span>
                      ) : (
                        <span className="badge badge-gray">Unassigned</span>
                      )}
                    </td>
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
          title="Delete subject?"
          message={`"${toDelete.name}" (${toDelete.code}) and all its attendance records will be permanently removed.`}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
