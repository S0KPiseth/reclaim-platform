import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "../../lib/router";
import { PageLoading } from "../ui/Loading";

/** Gate for screens that call authenticated endpoints. */
export default function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) {
      const next = encodeURIComponent(`${pathname}${search}`);
      navigate(`/login?next=${next}`, { replace: true });
    }
  }, [ready, user, pathname, search, navigate]);

  if (!ready) return <PageLoading label="Checking your session…" />;
  if (!user) return null;

  return children;
}
