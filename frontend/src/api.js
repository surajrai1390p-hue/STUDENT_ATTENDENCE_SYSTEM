/**
 * ============================================================
 *  API.JS — Central Axios instance (frontend → backend)
 * ============================================================
 *  All network calls go through this instance so that:
 *
 *   1. baseURL is set once → pages just call api.get('/students')
 *   2. REQUEST interceptor automatically attaches the JWT from
 *      localStorage to every request (no manual headers anywhere)
 *   3. RESPONSE interceptor catches 401 (expired/invalid token)
 *      → clears the session and redirects to /login
 *
 *  Exam point: "We never store the password on the client;
 *  only the JWT returned by login."
 * ============================================================
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

// Runs BEFORE every request is sent
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Runs AFTER every response — used for global session handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 = token missing/expired → force logout once
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Extracts the human-readable message from a failed API call
export const errMsg = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback;

export default api;
