/**
 * ============================================================
 *  LAYOUT.JSX — Shared app shell (sidebar + topbar + page area)
 * ============================================================
 *  Structure:   /login  → full-screen, no Layout
 *               other   → Guard → Layout → <Outlet/> renders the page
 *
 *  NavLink renders an <a> and automatically adds class "active"
 *  to the current route — that's how the sidebar highlights.
 *
 *  Role-based menu: the NAV array stores which roles may see an
 *  item (e.g. Teachers is admin-only). Note this only HIDES the
 *  link — real protection is on the API (requireRole).
 * ============================================================
 */
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Sidebar menu definition — `roles` = who can see the item (no roles = everyone)
const NAV = [
  { section: 'Overview' },
  { to: '/', label: 'Dashboard', end: true },
  { section: 'Management' },
  { to: '/students', label: 'Students' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/teachers', label: 'Teachers', roles: ['admin'] },
  { section: 'Attendance' },
  { to: '/attendance', label: 'Mark Attendance' },
  { to: '/reports', label: 'Reports' }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false); // mobile sidebar toggle

  // Filter menu items by the logged-in user's role
  const items = NAV.filter((n) => !n.roles || n.roles.includes(user?.role));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">G</div>
          <div>
            GGPR Attendance
            <div style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', marginTop: 1 }}>
              GVM's GGPR College, Ponda
            </div>
          </div>
        </div>
        {items.map((n, i) =>
          n.section ? (
            <div key={`s${i}`} className="sidebar-section">
              {n.section}
            </div>
          ) : (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {n.label}
            </NavLink>
          )
        )}
        <div className="sidebar-footer">
          BCA · ISA Project
          <br />
          Suraj Rai (2405033)
          <br />
          Shivam Shet (2405026)
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-outline btn-sm menu-btn" onClick={() => setOpen(!open)}>
              ☰ Menu
            </button>
            <div>
              <div className="topbar-title">Student Attendance System</div>
              <div className="topbar-sub">
                GVM's Gopal Govind Poy Raiturcar College of Commerce &amp; Economics, Ponda
              </div>
            </div>
          </div>
          <div className="topbar-user">
            <div className="user-meta">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
            <div className="avatar">{user?.name?.charAt(0)?.toUpperCase() || '?'}</div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                logout();
                nav('/login');
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Rendered page goes here — React Router injects the matched route */}
        <Outlet />
      </div>
    </div>
  );
}
