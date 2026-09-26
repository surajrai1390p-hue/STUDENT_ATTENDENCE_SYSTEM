/**
 * ============================================================
 *  APP.JSX — Routing table of the application
 * ============================================================
 *  Route structure:
 *
 *    /login        → public
 *    /*            → wrapped in <Guard> + <Layout> (sidebar shell)
 *
 *  <Guard> is our PROTECTED ROUTE:
 *    - no user  → redirect to /login
 *    - wrong role (e.g. teacher opening /teachers)
 *      → redirect to / (role-based access control on the client)
 *
 *  NOTE: client-side guards only hide UI — the backend
 *  requireRole() middleware is the real security layer.
 * ============================================================
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Subjects from './pages/Subjects';
import Teachers from './pages/Teachers';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';

// Protected route wrapper — optional roles list for admin-only pages
function Guard({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route — no layout, no guard */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated routes — share the sidebar Layout */}
            <Route
              element={
                <Guard>
                  <Layout />
                </Guard>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/subjects" element={<Subjects />} />
              {/* Admin-only page (double-guarded, also blocked by API) */}
              <Route
                path="/teachers"
                element={
                  <Guard roles={['admin']}>
                    <Teachers />
                  </Guard>
                }
              />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/reports" element={<Reports />} />
            </Route>

            {/* Unknown URLs → dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
