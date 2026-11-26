import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "../lib/router";
import { safeNext } from "../lib/format";
import usePageTitle from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import InlineAlert from "../components/ui/InlineAlert";
import { Spinner } from "../components/ui/Loading";
import { ArrowRightIcon, ShieldIcon } from "../components/reclaim/icons";

export default function LoginPage() {
  usePageTitle("Log in");

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setBusy(true);
    try {
      const signedIn = await login({ email: email.trim(), password });
      toast(`Welcome back, ${signedIn.name.split(" ")[0]}.`);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[440px] py-4">
      <Link to="/" className="mb-4 inline-block text-[13px] font-semibold text-white/75 hover:text-white">
        ← Back home
      </Link>

      <section className="rc-panel p-6 sm:p-7">
        <p className="text-[11px] font-extrabold tracking-[0.2em] text-brand-600 uppercase">Members</p>
        <h1 className="mt-1 text-[28px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
          Welcome back
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-muted">
          Log in to claim items and manage the ones you’ve found.
        </p>

        {user && (
          <InlineAlert tone="info" className="mt-4">
            You’re already signed in as <strong>{user.name}</strong>. Logging in again switches
            accounts.
          </InlineAlert>
        )}

        {error && <InlineAlert className="mt-4">{error}</InlineAlert>}

        <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
          <div>
            <label htmlFor="email" className="rc-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="rc-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@campus.edu"
            />
          </div>

          <div>
            <label htmlFor="password" className="rc-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="rc-field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
            />
          </div>

          <button type="submit" className="rc-btn rc-btn-block mt-1" disabled={busy}>
            {busy ? <Spinner size={14} /> : <ArrowRightIcon size={16} />}
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-ink-muted">
          New here?{" "}
          <Link to={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>

        <div className="mt-5 flex items-start gap-2 rounded-2xl bg-surface-soft px-3.5 py-3 text-[12px] leading-relaxed text-ink-muted">
          <ShieldIcon size={15} className="mt-0.5 flex-none text-brand-600" />
          <span>
            Demo data: <strong className="text-ink">sothy@reclaim.test</strong> /{" "}
            <strong className="text-ink">password123</strong>
          </span>
        </div>
      </section>
    </div>
  );
}
