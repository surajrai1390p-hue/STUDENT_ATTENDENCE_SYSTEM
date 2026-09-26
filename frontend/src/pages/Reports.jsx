/**
 * ============================================================
 *  REPORTS.JSX — Percentages + defaulters list
 * ============================================================
 *  Only ONE API call:
 *    GET /attendance/report → every student: total / present / %
 *
 *  The defaulters list is NOT a separate request — we simply
 *  filter the same data in JavaScript:
 *      rows.filter(r => r.pct < 75)
 *
 *  Other features:
 *    - Summary cards: students counted, average, defaulter count
 *    - Progress bar per row (green ≥75%, red <75%)
 *    - "Export CSV" builds the file in the BROWSER (Blob)
 *    - Report auto-runs when the subject changes
 * ============================================================
 */
import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useToast } from '../ToastContext';
import { EmptyIcon, TableIcon } from '../components/Icons';

// Default filter = current month (from 1st to last day)
const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};
const monthEnd = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
};

export default function Reports() {
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [sid, setSid] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get('/subjects')
      .then((r) => {
        setSubjects(r.data);
        setSid((prev) => prev || r.data[0]?.id || '');
      })
      .catch((e) => toast.error(errMsg(e, 'Failed to load subjects')));
  }, []);

  useEffect(() => {
    if (sid) load();
  }, [sid]);

  // Fetch the report once, then derive everything else from it
  const load = async () => {
    if (!sid || !from || !to) return;
    setLoading(true);
    try {
      const res = await api.get('/attendance/report', {
        params: { subject_id: sid, from, to }
      });
      setRows(res.data);
      setLoaded(true);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = 'Roll No,Name,Total Classes,Present,Absence %\n';
    const body = rows
      .map((r) => `${r.roll_no},"${r.name}",${r.total},${r.present},${r.pct ?? 0}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const subject = subjects.find((s) => String(s.id) === String(sid));
    a.href = url;
    a.download = `attendance_${subject?.code || 'report'}_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV');
  };

  // ---------- Everything below is derived from `rows` ----------
  const withData = rows.filter((r) => r.total > 0);

  // Defaulters = same data, filtered (below 75%)
  const def = rows
    .filter((r) => r.pct !== null && Number(r.pct) < 75)
    .sort((a, b) => a.pct - b.pct); // worst first

  // Average of all student percentages
  let avg = null;
  if (withData.length > 0) {
    const sum = withData.reduce((total, r) => total + Number(r.pct || 0), 0);
    avg = Math.round(sum / withData.length);
  }

  const subject = subjects.find((s) => String(s.id) === String(sid));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Defaulters</h1>
          <p className="page-subtitle">
            Subject-wise attendance percentage with a below-75% defaulter list
          </p>
        </div>
        {loaded && rows.length > 0 && (
          <button className="btn btn-outline" onClick={exportCsv}>
            Export CSV
          </button>
        )}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="field" style={{ minWidth: 220 }}>
            <label className="label">Subject</label>
            <select className="select" value={sid} onChange={(e) => setSid(e.target.value)}>
              {subjects.length === 0 && <option value="">No subjects available</option>}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">From</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">To</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button className="btn btn-primary" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Load Report'}
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ padding: '8px 0 16px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div className="skeleton skeleton-row" key={i} />
            ))}
          </div>
        )}

        {loaded && !loading && (
          <>
            <div className="stats-grid" style={{ marginBottom: 0 }}>
              <div className="stat-card">
                <div>
                  <div className="stat-value">{withData.length}</div>
                  <div className="stat-label">Students with records</div>
                </div>
              </div>
              <div className="stat-card">
                <div>
                  <div className={`stat-value ${avg !== null && avg < 75 ? 'stat-low' : 'stat-ok'}`}>
                    {avg !== null ? `${avg}%` : '—'}
                  </div>
                  <div className="stat-label">Average attendance</div>
                </div>
              </div>
              <div className="stat-card">
                <div>
                  <div className={`stat-value ${def.length ? 'stat-low' : 'stat-ok'}`}>
                    {def.length}
                  </div>
                  <div className="stat-label">Defaulters (below 75%)</div>
                </div>
              </div>
            </div>

            <div className="card-title" style={{ margin: '24px 0 4px' }}>
              Attendance percentage
            </div>
            <div className="card-desc" style={{ marginBottom: 14 }}>
              {subject ? `${subject.code} — ${subject.name}` : ''} · {from} to {to}
            </div>

            {rows.length === 0 ? (
              <div className="empty-state">
                <EmptyIcon>
                  <TableIcon />
                </EmptyIcon>
                <div className="empty-title">No data for this range</div>
                <div className="empty-desc">Mark attendance first, then run the report.</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student</th>
                      <th>Total</th>
                      <th>Present</th>
                      <th style={{ width: 200 }}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const pct = r.pct === null ? null : Number(r.pct);
                      const ok = pct !== null && pct >= 75;
                      return (
                        <tr key={r.id}>
                          <td>
                            <span className="badge badge-indigo">{r.roll_no}</span>
                          </td>
                          <td className="cell-main">{r.name}</td>
                          <td>{r.total}</td>
                          <td>{r.present}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="progress" style={{ flex: 1 }}>
                                <div
                                  className={`progress-bar ${ok ? 'ok' : 'low'}`}
                                  style={{ width: `${pct || 0}%` }}
                                />
                              </div>
                              <span className={`pct ${ok ? 'ok' : 'low'}`}>
                                {pct === null ? '—' : `${pct}%`}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="card-title" style={{ margin: '26px 0 4px' }}>
              Defaulters (below 75%)
            </div>
            <div className="card-desc" style={{ marginBottom: 14 }}>
              Students who need attention this period
            </div>

            {def.length === 0 ? (
              <div className="alert alert-success">
                All students are above the 75% attendance threshold for this period.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student</th>
                      <th>Total</th>
                      <th>Present</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {def.map((d, i) => (
                      <tr key={i}>
                        <td>
                          <span className="badge badge-red">{d.roll_no}</span>
                        </td>
                        <td className="cell-main">{d.name}</td>
                        <td>{d.total}</td>
                        <td>{d.present}</td>
                        <td className="pct low">{d.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
