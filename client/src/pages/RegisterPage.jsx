import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "../lib/router";
import { safeNext } from "../lib/format";
import usePageTitle from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import InlineAlert from "../components/ui/InlineAlert";
import { Spinner } from "../components/ui/Loading";
import { ArrowRightIcon } from "../components/reclaim/icons";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function RegisterPage() {
  usePageTitle("Create an account");

  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [values, setValues] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!values.name.trim()) {
      setError("Tell us your name.");
      return;
    }
    if (!EMAIL_RE.test(values.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (values.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const body = {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      };
      if (values.phone.trim()) body.phone = values.phone.trim();

      const created = await register(body);
      toast(`Welcome to Reclaim, ${created.name.split(" ")[0]}.`);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[460px] py-4">
      <Link to="/" className="mb-4 inline-block text-[13px] font-semibold text-white/75 hover:text-white">
        ← Back home
      </Link>

      <section className="rc-panel p-6 sm:p-7">
        <p className="text-[11px] font-extrabold tracking-[0.2em] text-brand-600 uppercase">Join Reclaim</p>
        <h1 className="mt-1 text-[28px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
          Create your account
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-muted">
          One account to report finds, claim what’s yours, and track the handover.
        </p>

        {error && <InlineAlert className="mt-4">{error}</InlineAlert>}

        <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
          <div>
            <label htmlFor="name" className="rc-label">
              Name
            </label>
            <input
              id="name"
              autoComplete="name"
              maxLength={100}
              className="rc-field"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="Sothy Chan"
            />
          </div>

          <div>
            <label htmlFor="email" className="rc-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="rc-field"
              value={values.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="you@campus.edu"
            />
          </div>

          <div>
            <label htmlFor="password" className="rc-label">
              Password <span className="font-normal text-ink-muted">(8+ characters)</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="rc-field"
              value={values.password}
              onChange={(event) => setField("password", event.target.value)}
              placeholder="Choose a password"
            />
          </div>

          <div>
            <label htmlFor="phone" className="rc-label">
              Phone <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              className="rc-field"
              value={values.phone}
              onChange={(event) => setField("phone", event.target.value)}
              placeholder="+855 12 345 678"
            />
            <p className="mt-1 text-[12px] text-ink-muted">
              Only shown to the poster of an item whose claim you win.
            </p>
          </div>

          <button type="submit" className="rc-btn rc-btn-block mt-1" disabled={busy}>
            {busy ? <Spinner size={14} /> : <ArrowRightIcon size={16} />}
            {busy ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-ink-muted">
          Have an account?{" "}
          <Link to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </section>
    </div>
  );
}
