import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { Link, useNavigate } from "../lib/router";
import usePageTitle from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import Avatar from "../components/ui/Avatar";
import InlineAlert from "../components/ui/InlineAlert";
import PageHeader from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/Loading";
import {
  ArrowRightIcon,
  InboxIcon,
  LogOutIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  ShieldIcon,
  SparkleIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from "../components/reclaim/icons";

export default function ProfilePage() {
  usePageTitle("Your account");

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [me, setMe] = useState(user);
  const [reindexing, setReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);

  const account = me ?? user;
  const isAdmin = account?.role === "ADMIN";

  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/me")
      .then((res) => {
        if (!cancelled) setMe(res.user);
      })
      .catch(() => {
        if (!cancelled) setMe(user);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return undefined;

    let cancelled = false;
    api
      .get("/categories")
      .then((res) => {
        if (!cancelled) setCategories(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function signOut() {
    await logout();
    toast("Logged out.");
    navigate("/");
  }

  async function reindex() {
    setReindexing(true);
    try {
      const res = await api.post("/items/reindex");
      setReindexResult(res.data);
      toast(
        res.data.enabled
          ? `Indexed ${res.data.indexed} item(s).`
          : "AI search is not configured on this server.",
        res.data.enabled ? "success" : "error",
      );
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setReindexing(false);
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    const name = newCategory.trim();
    if (name.length < 2 || name.length > 40) {
      toast("Category names must be 2–40 characters.", "error");
      return;
    }

    setCategoryBusy(true);
    try {
      const res = await api.post("/categories", { name });
      const category = res.data;
      setCategories((current) => {
        if (current.some((entry) => entry.id === category.id)) {
          return current.map((entry) => (entry.id === category.id ? category : entry));
        }
        return [...current, category].sort((a, b) => a.name.localeCompare(b.name));
      });
      setNewCategory("");
      toast("Category saved.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function removeCategory(category) {
    const ok = await confirm({
      title: `Delete “${category.name}”?`,
      message: "Only categories that no item uses can be deleted.",
      confirmLabel: "Delete category",
      tone: "danger",
    });
    if (!ok) return;

    setCategoryBusy(true);
    try {
      await api.del(`/categories/${encodeURIComponent(category.id)}`);
      setCategories((current) => current.filter((entry) => entry.id !== category.id));
      toast("Category deleted.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setCategoryBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Who you are on the board, and where to find everything you’ve posted or claimed."
      />

      <section className="rc-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar user={account} size="lg" className="ring-4 ring-white/70" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[24px] font-extrabold tracking-[-0.015em] text-ink">
              {account?.name}
            </h2>
            <p className="mt-0.5 truncate text-[13.5px] text-ink-muted">{account?.email}</p>
          </div>
          <span className="rounded-full bg-tint px-3 py-1 text-[11px] font-extrabold tracking-wide text-brand-700 uppercase">
            {account?.role === "ADMIN" ? "Admin" : "Member"}
          </span>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface-soft/60 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-wide text-ink-muted uppercase">
              <MailIcon size={13} /> Email
            </dt>
            <dd className="mt-1 truncate text-[14px] font-semibold text-ink">{account?.email}</dd>
          </div>

          <div className="rounded-2xl border border-line bg-surface-soft/60 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-wide text-ink-muted uppercase">
              <PhoneIcon size={13} /> Phone
            </dt>
            <dd className="mt-1 truncate text-[14px] font-semibold text-ink">
              {account?.phone || "Not added"}
            </dd>
          </div>

          <div className="rounded-2xl border border-line bg-surface-soft/60 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-wide text-ink-muted uppercase">
              <UserIcon size={13} /> Member since
            </dt>
            <dd className="mt-1 text-[14px] font-semibold text-ink">
              {formatDate(account?.createdAt)}
            </dd>
          </div>

          <div className="rounded-2xl border border-line bg-surface-soft/60 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-wide text-ink-muted uppercase">
              <ShieldIcon size={13} /> Role
            </dt>
            <dd className="mt-1 text-[14px] font-semibold text-ink">
              {account?.role === "ADMIN" ? "Administrator" : "Member"}
            </dd>
          </div>
        </dl>

        <InlineAlert tone="info" className="mt-5">
          Editing your name, email or password isn’t available in the API yet. Ask an admin if you
          need an account change.
        </InlineAlert>

        {account?.role === "ADMIN" && (
          <div className="mt-5 rounded-2xl border border-line bg-surface-soft/60 p-4">
            <h3 className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
              <SparkleIcon size={15} className="text-brand-600" />
              Admin tools
            </h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
              Backfill AI vectors for items created while the embedding service was offline, or
              refresh them after a model update. Safe to run any time.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rc-btn rc-btn-outline rc-btn-sm"
                onClick={reindex}
                disabled={reindexing}
              >
                {reindexing ? <Spinner size={13} /> : <SparkleIcon size={13} />}
                Reindex AI search
              </button>
              {reindexResult && (
                <span className="text-[12px] font-semibold text-ink-muted">
                  {reindexResult.enabled
                    ? `Indexed ${reindexResult.indexed} · ${reindexResult.remaining} remaining (${reindexResult.modelVersion})`
                    : "AI search is disabled"}
                </span>
              )}
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <h4 className="flex items-center gap-1.5 text-[11.5px] font-extrabold tracking-wide text-ink-muted uppercase">
                <TagIcon size={13} /> Categories
              </h4>
              <form className="mt-2 flex flex-wrap gap-2" onSubmit={addCategory}>
                <input
                  className="rc-field min-w-[160px] flex-1"
                  value={newCategory}
                  maxLength={40}
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder="New category name"
                  aria-label="New category name"
                />
                <button type="submit" className="rc-btn rc-btn-outline rc-btn-sm" disabled={categoryBusy}>
                  Add
                </button>
              </form>

              {categories.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {categories.map((entry) => (
                    <li
                      key={entry.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink"
                    >
                      {entry.name}
                      <span className="text-ink-muted">{entry.itemCount}</span>
                      {entry.itemCount === 0 && (
                        <button
                          type="button"
                          className="flex size-4 cursor-pointer items-center justify-center rounded-full border-0 bg-[#eef2fb] text-ink-muted hover:bg-danger-soft hover:text-danger"
                          onClick={() => removeCategory(entry)}
                          disabled={categoryBusy}
                          aria-label={`Delete category ${entry.name}`}
                          title="Delete category"
                        >
                          <XIcon size={10} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          <Link to="/my-items" className="rc-btn rc-btn-sm">
            <SearchIcon size={15} />
            My posts
          </Link>
          <Link to="/my-claims" className="rc-btn rc-btn-outline rc-btn-sm">
            <InboxIcon size={15} />
            My claims
          </Link>
          <Link to="/report" className="rc-btn rc-btn-outline rc-btn-sm">
            Report a find
            <ArrowRightIcon size={14} />
          </Link>
          <button type="button" className="rc-btn rc-btn-danger rc-btn-sm ml-auto" onClick={signOut}>
            <LogOutIcon size={15} />
            Log out
          </button>
        </div>
      </section>
    </div>
  );
}
