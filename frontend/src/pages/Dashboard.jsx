/**
 * ============================================================
 *  DASHBOARD.JSX — Landing page after login
 * ============================================================
 *  Loads FOUR things for this page:
 *    GET /api/stats            → 4 counter cards
 *    GET /api/stats/trend      → line chart (last 14 days)
 *    GET /api/stats/classes    → bar chart (class-wise %)
 *    GET /api/attendance/recent → "Recently marked" list
 *
 *  Simple approach:
 *   - all four requests fire together with Promise.all
 *   - stat numbers are plain values (no animation code)
 *   - Recharts only receives data + a few labels
 *   - skeleton placeholders show while loading
 * ============================================================
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';

// One small presentational component = one stat card
function Stat({ value, label, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-value ${tone || ''}`}>{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// Custom tooltip so chart popups match the app style
function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tt-label">{label}</div>
      <div className="tt-row">
        {payload[0].name}: {payload[0].value}
        {unit}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [trend, setTrend] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load all dashboard data in one go
  useEffect(() => {
    (async () => {
      try {
        // Promise.all = send all 4 requests at the same time
        const [s, r, t, c] = await Promise.all([
          api.get('/stats'),
          api.get('/attendance/recent'),
          api.get('/stats/trend', { params: { days: 14 } }),
          api.get('/stats/classes', { params: { days: 30 } })
        ]);

        setStats(s.data);
        setRecent(r.data);

        // Convert ISO date (2026-09-08) → "08 Sep" for the x-axis
        setTrend(
          t.data.map((row) => ({
            ...row,
            day: new Date(row.date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short'
            })
          }))
        );
        setClasses(c.data);
      } catch (e) {
        setError(errMsg(e, 'Could not load dashboard'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Today's % — simple arithmetic (e.g. 18/24 → 75%)
  let todayPct = null;
  if (stats && stats.today_total > 0) {
    todayPct = Math.round((stats.today_present / stats.today_total) * 100);
  }

  // ---------- Loading state: gray skeleton boxes ----------
  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="skeleton" style={{ width: 160, height: 28 }} />
            <div className="skeleton" style={{ width: 280, height: 14, marginTop: 10 }} />
          </div>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div className="skeleton skeleton-stat" key={i} />
          ))}
        </div>
        <div className="grid-charts">
          <div className="skeleton" style={{ height: 280, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Overview of students, subjects and today's attendance
          </p>
        </div>
        <Link to="/attendance" className="btn btn-primary">
          Mark Attendance
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ---------- Four counter cards ---------- */}
      <div className="stats-grid">
        <Stat value={stats?.students} label="Total Students" />
        <Stat value={stats?.subjects} label="Subjects" />
        <Stat value={stats?.teachers} label="Teachers" />
        <Stat
          value={todayPct !== null ? `${todayPct}%` : null}
          label="Today's Attendance"
          tone={todayPct !== null && todayPct < 75 ? 'stat-low' : 'stat-ok'}
        />
      </div>

      {/* ---------- Two charts side by side ---------- */}
      <div className="grid-charts">
        <div className="card chart-card">
          <div className="card-title">Attendance trend</div>
          <div className="card-desc">Daily percentage — last 14 days</div>
          {trend.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 12px' }}>
              <div className="empty-title">No trend data yet</div>
              <div className="empty-desc">Mark attendance for a few days to see the graph</div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#eef1f7" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#93a0b4' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e9f2' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#93a0b4' }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip unit="%" />} />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    name="Attendance"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#4f46e5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="chart-note">Percentage of students present per day</div>
            </>
          )}
        </div>

        <div className="card chart-card">
          <div className="card-title">Class-wise average</div>
          <div className="card-desc">Average % — last 30 days</div>
          {classes.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 12px' }}>
              <div className="empty-title">No class data yet</div>
              <div className="empty-desc">Add students and mark attendance</div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={classes} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#eef1f7" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="class_name"
                    tick={{ fontSize: 11, fill: '#93a0b4' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e9f2' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#93a0b4' }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    content={<ChartTooltip unit="%" />}
                    cursor={{ fill: 'rgba(79,70,229,0.06)' }}
                  />
                  <Bar dataKey="pct" name="Avg attendance" radius={[6, 6, 0, 0]} barSize={36}>
                    {/* Green bar if ≥75%, red if below */}
                    {classes.map((c, i) => (
                      <Cell key={i} fill={(c.pct || 0) >= 75 ? '#059669' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-note">Green ≥ 75% · Red below 75%</div>
            </>
          )}
        </div>
      </div>

      {/* ---------- Quick actions + today summary ---------- */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Quick actions</div>
          <div className="card-desc">Common tasks</div>
          <div className="quick-actions">
            <Link to="/attendance" className="quick-action">
              <div>
                <div className="qa-title">Mark attendance</div>
                <div className="qa-desc">Record present / absent for a class</div>
              </div>
            </Link>
            <Link to="/reports" className="quick-action">
              <div>
                <div className="qa-title">View reports</div>
                <div className="qa-desc">Percentages and defaulters list</div>
              </div>
            </Link>
            <Link to="/students" className="quick-action">
              <div>
                <div className="qa-title">Manage students</div>
                <div className="qa-desc">Add or remove students</div>
              </div>
            </Link>
            <Link to="/subjects" className="quick-action">
              <div>
                <div className="qa-title">Subjects</div>
                <div className="qa-desc">Codes and teacher assignments</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Today at a glance</div>
          <div className="card-desc">
            {stats?.today_total
              ? `${stats.today_present} present · ${stats.today_absent} absent of ${stats.today_total} records`
              : 'No attendance marked yet today'}
          </div>
          {stats?.today_total > 0 && (
            <div className="progress" style={{ marginBottom: 18 }}>
              <div
                className={`progress-bar ${todayPct >= 75 ? 'ok' : 'low'}`}
                style={{ width: `${todayPct}%` }}
              />
            </div>
          )}

          <div className="card-title" style={{ marginTop: 6 }}>
            Recently marked
          </div>
          {recent.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 10px' }}>
              <div className="empty-title">No records yet</div>
              <div className="empty-desc">Attendance marked today will appear here</div>
            </div>
          ) : (
            <div>
              {recent.slice(0, 5).map((r, i) => (
                <div className="list-row" key={i}>
                  <div>
                    <div className="cell-main">
                      {r.name} <span className="cell-sub">· {r.code}</span>
                    </div>
                    <div className="cell-sub">{new Date(r.date).toLocaleDateString()}</div>
                  </div>
                  <span className={`badge ${r.status === 'Present' ? 'badge-green' : 'badge-red'}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
