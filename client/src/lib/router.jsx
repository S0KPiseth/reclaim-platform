/**
 * Minimal history-API router. No dependency needed for a handful of routes.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const RouterContext = createContext(null);

const snapshot = () => ({
  pathname: window.location.pathname || "/",
  search: window.location.search || "",
});

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(snapshot);

  useEffect(() => {
    const sync = () => setLocation(snapshot());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (!to) return;
    const current = window.location.pathname + window.location.search;
    if (to === current) return;

    if (replace) window.history.replaceState({}, "", to);
    else window.history.pushState({}, "", to);

    setLocation(snapshot());
    window.scrollTo(0, 0);
  }, []);

  const value = useMemo(() => ({ ...location, navigate }), [location, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useLocation() {
  const context = useContext(RouterContext);
  if (!context) throw new Error("useLocation must be used inside <RouterProvider>");
  return context;
}

export function useNavigate() {
  return useLocation().navigate;
}

/** Parsed query string for the current location. */
export function useSearchParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function Link({ to, replace = false, onClick, children, ...props }) {
  const navigate = useNavigate();
  const external = typeof to !== "string" || !to.startsWith("/");

  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (external) return;
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        navigate(to, { replace });
      }}
      {...props}
    >
      {children}
    </a>
  );
}
