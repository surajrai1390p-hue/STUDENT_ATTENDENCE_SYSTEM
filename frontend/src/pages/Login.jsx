/**
 * ============================================================
 *  LOGIN.JSX — Authentication screen
 * ============================================================
 *  Flow demonstrated here:
 *   1. User submits email + password
 *   2. POST /api/auth/login → server verifies bcrypt hash
 *   3. Server responds with { token, user }
 *   4. login(token, user) stores both in AuthContext/localStorage
 *   5. useNavigate('/') sends the user to the dashboard
 *
 *  Demo credentials: click a card below the form to auto-fill —
 *  handy during the presentation.
 * ============================================================
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

const DEMOS = [
  { role: 'Admin', email: 'admin@college.edu', password: 'admin123' },
  { role: 'Teacher', email: 'teacher@college.edu', password: 'teacher123' }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  // Called on form submit — prevents the default page reload
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user); // save session (AuthContext)
      toast.success('Logged in');
      nav('/'); // redirect to dashboard
    } catch (e2) {
      setErr(errMsg(e2, 'Invalid email or password')); // 401 message from API
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-college">
        <div className="college-mark">G</div>
        <h1>Student Attendance System</h1>
        <p className="college-name">
          GVM's Gopal Govind Poy Raiturcar
          <br />
          College of Commerce &amp; Economics
        </p>
        <p className="college-meta">Ponda, Goa · Established 1986</p>
        <div className="college-rule" />
        <p className="college-note">
          Admins manage students, subjects and teachers. Teachers mark daily
          attendance and view reports.
        </p>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <h2>Sign in</h2>
          <p className="sub">Use your college account to continue</p>

          <form onSubmit={submit}>
            {err && <div className="alert alert-error">{err}</div>}
            <div className="field">
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                required
                autoComplete="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="demo-box">
            <div className="demo-label">Demo accounts (click to fill)</div>
            <div className="demo-creds">
              {DEMOS.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  className="demo-cred"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword(d.password);
                    setErr('');
                  }}
                >
                  <span className="role">{d.role}</span>
                  <span className="creds">
                    {d.email} / {d.password}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="login-authors">
            Project by Suraj Rai (2405033) &amp; Shivam Shet (2405026)
            <br />
            BCA · ISA Project
          </div>
        </div>
      </div>
    </div>
  );
}
