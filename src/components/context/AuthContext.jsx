import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authAPI } from '@/lib/apiClient';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { sessionCleared, sessionLoading, sessionResolved } from '@/store/slices/authSlice';
import { toast } from 'sonner';

const AuthContext = createContext(null);

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

/**
 * The `sub`/`id` claim out of a JWT, without verifying it.
 *
 * This is only ever used to decide whether the cached user object may be shown
 * during the first paint. Verification is the server's job; being wrong here
 * can only cost us an avoidable loading state, never access.
 */
function subjectOf(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json);
    return claims?.id ?? claims?.sub ?? null;
  } catch {
    return null;
  }
}

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSessionStorageKeys() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage can throw in private mode; the in-memory state below still clears */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  /**
   * Mirror the session into the Redux store.
   *
   * The context stays the owner — it is what talks to the API, validates the
   * token and keeps browser tabs in step — and the store is kept in lockstep
   * with it so anything reading from Redux sees the same user. Doing it in one
   * effect rather than at each call site means no future branch can update one
   * and forget the other, which is the failure mode that produced the
   * wrong-account bug in the first place.
   */
  useEffect(() => {
    if (loading) {
      dispatch(sessionLoading());
    } else if (user) {
      dispatch(sessionResolved(user));
    } else {
      dispatch(sessionCleared());
    }
  }, [user, loading, dispatch]);

  // Guards against a late `me()` response from a session that has since been
  // replaced (log out and straight back in as someone else).
  const sessionRef = useRef(0);

  /**
   * Establish who the caller is, with the server as the only authority.
   *
   * Three things here were wrong before and caused most of the reported
   * session problems:
   *
   *  - The whole check was gated on `token && storedUser`. A valid token with
   *    no cached user object meant the block never ran, so a logged-in person
   *    was rendered as "Guest" and told to log in to vote.
   *  - `setLoading(false)` ran synchronously, before `me()` resolved, so every
   *    consumer saw `user: null, loading: false` for a beat and rendered the
   *    signed-out state.
   *  - The cached user was adopted unconditionally. After switching accounts
   *    that meant the previous account's name and email were shown — and if
   *    `me()` then failed, they stayed on screen.
   */
  const bootstrap = useCallback(async () => {
    const mySession = ++sessionRef.current;
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    // Optimistic paint, but only when the cache provably belongs to this token.
    const cached = readCachedUser();
    const subject = subjectOf(token);
    if (cached && subject && String(cached.id) === String(subject)) {
      setUser(cached);
    } else if (cached) {
      // Stale cache from a different account: drop it rather than show it.
      try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
    }

    try {
      const fresh = await authAPI.me();
      if (sessionRef.current !== mySession) return null; // superseded
      setUser(fresh);
      try { localStorage.setItem(USER_KEY, JSON.stringify(fresh)); } catch { /* ignore */ }
      return fresh;
    } catch (error) {
      if (sessionRef.current !== mySession) return null;
      // A network blip should not sign anyone out; only a rejected token should.
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        clearSessionStorageKeys();
        setUser(null);
      } else {
        console.warn('Could not refresh the session right now:', error?.message);
      }
      return null;
    } finally {
      if (sessionRef.current === mySession) setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  /**
   * Keep every tab on the same session.
   *
   * `storage` fires in the *other* tabs when one of them writes, which is
   * exactly the signal needed: logging in here signs the other tabs in, and
   * logging out here signs them out, instead of each tab holding whatever it
   * happened to load with.
   */
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key && event.key !== TOKEN_KEY && event.key !== USER_KEY) return;

      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        sessionRef.current += 1;
        setUser(null);
        setLoading(false);
        return;
      }
      // Token appeared or changed in another tab — re-establish from the server.
      bootstrap();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [bootstrap]);

  const login = useCallback(async (email, password) => {
    const data = await authAPI.login(email, password);
    sessionRef.current += 1;
    setUser(data.user);
    setLoading(false);
    return data;
  }, []);

  const googleLogin = useCallback(async (token, role = 'user') => {
    const data = await authAPI.googleLogin(token, role);
    sessionRef.current += 1;
    setUser(data.user);
    setLoading(false);
    return data;
  }, []);

  const register = useCallback(async (email, password, name, role = 'user') => {
    const data = await authAPI.register(email, password, name, role);
    // Registration may now complete without a session when the account still
    // has to verify an emailed code, so only adopt a user if one came back.
    if (data?.accessToken && data?.user) {
      sessionRef.current += 1;
      setUser(data.user);
      setLoading(false);
    }
    return data;
  }, []);

  // authAPI.logout revokes the refresh token on the server, so it has to be
  // awaited; fire-and-forget left the session alive server-side.
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      sessionRef.current += 1;
      setUser(null);
      clearSessionStorageKeys();
      toast.success('Logged out successfully');
      navigate('/login');
    }
  }, [navigate]);

  /** Re-read the signed-in user from the server (after a profile edit, say). */
  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authAPI.me();
      setUser(fresh);
      try { localStorage.setItem(USER_KEY, JSON.stringify(fresh)); } catch { /* ignore */ }
      return fresh;
    } catch {
      return null;
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    googleLogin,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
