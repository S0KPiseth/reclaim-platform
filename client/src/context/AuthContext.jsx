import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, session } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Cached user for instant paint; always revalidated against the session
  // cookie below, because JavaScript cannot read the httpOnly cookie.
  const [user, setUser] = useState(() => session.getUser());
  // `ready` is false until GET /auth/me has answered for this page load.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
        session.setUser(res.user);
      })
      .catch((err) => {
        if (cancelled) return;
        // Only the API rejecting the session is authoritative. On a network
        // error keep the cached user so the UI stays usable.
        if (err.status === 401) {
          session.clear();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fired by lib/api.js when the API rejects the session cookie.
  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("reclaim:session-expired", expire);
    return () => window.removeEventListener("reclaim:session-expired", expire);
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await api.post("/auth/login", credentials);
    session.setUser(res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (details) => {
    const res = await api.post("/auth/register", details);
    session.setUser(res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // The cookie is expired client-side either way.
    }
    session.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
