/**
 * ============================================================
 *  AUTHCONTEXT.JS — Global login state (React Context)
 * ============================================================
 *  Problem it solves: without context, every page would need to
 *  read localStorage itself to know who is logged in.
 *
 *  Solution: one AuthProvider at the top of the app holds
 *  { user, login, logout } — any component can read it with
 *  const { user } = useAuth().
 *
 *  Persistence: user + token are saved to localStorage, so a
 *  page refresh keeps the session (until the JWT expires).
 * ============================================================
 */
import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

// Custom hook — cleaner access: const { user } = useAuth()
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  // Initialise from localStorage so refresh keeps you logged in
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  // Called by Login.jsx after a successful POST /api/auth/login
  const login = (token, u) => {
    localStorage.setItem('token', token); // JWT for API calls
    localStorage.setItem('user', JSON.stringify(u)); // for UI (name, role)
    setUser(u);
  };

  // Called by the Logout button — clears session completely
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
