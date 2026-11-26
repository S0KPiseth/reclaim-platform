import { useEffect, useState } from "react";
import { api, itemImage } from "../lib/api";
import { formatDate, timeAgo } from "../lib/format";
import { Link, useNavigate } from "../lib/router";
import usePageTitle from "../lib/usePageTitle";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import StatusBadge from "../components/ui/StatusBadge";
import { PageLoading, Spinner } from "../components/ui/Loading";
import { PhotoPlaceholder } from "../components/ui/ItemCard";
import {
  AlertIcon,
  ArrowRightIcon,
  EditIcon,
  InboxIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "../components/reclaim/icons";

export default function MyItemsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  usePageTitle("My posts");

  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/items/mine");
      setItems(res.data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/items/mine")
      .then((res) => {
        if (!cancelled) setItems(res.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function removeItem(item) {
    const ok = await confirm({
      title: "Remove this post?",
      message: `“${item.title}” will be archived and disappear from the board.`,
      confirmLabel: "Remove post",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(item.id);
    try {
      const res = await api.del(`/items/${encodeURIComponent(item.id)}`);
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, ...res.data } : entry)),
      );
      toast("Post removed.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Your activity"
        title="My posts"
        description="Everything you’ve reported. Open a post to read its claims, approve an owner, or mark it returned."
        actions={
          <Link to="/report" className="rc-btn rc-btn-light rc-btn-sm">
            <PlusIcon size={15} />
            Report a find
          </Link>
        }
      />

      {loading ? (
        <PageLoading label="Loading your posts…" />
      ) : error ? (
        <EmptyState
          tone="error"
          icon={<AlertIcon size={26} />}
          title="Couldn’t load your posts"
          description={error.message}
        >
          <button type="button" className="rc-btn rc-btn-sm" onClick={load}>
            Try again
          </button>
        </EmptyState>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size={26} />}
          title="No posts yet"
          description="Found something? Put it on the board so its owner can find it — it only takes a minute."
        >
          <Link to="/report" className="rc-btn rc-btn-sm">
            <PlusIcon size={15} />
            Report a find
          </Link>
          <Link to="/browse" className="rc-btn rc-btn-outline rc-btn-sm">
            Browse found items
          </Link>
        </EmptyState>
      ) : (
        <section className="rc-panel p-4 sm:p-5">
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => {
              const photo = itemImage(item);
              const archived = item.status === "ARCHIVED";
              return (
                <li key={item.id} className="rc-row">
                  <Link
                    to={`/items/${item.id}`}
                    className="size-[76px] flex-none overflow-hidden rounded-xl ring-1 ring-line"
                  >
                    {photo ? (
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <PhotoPlaceholder label="" className="text-[10px]" />
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/items/${item.id}`}
                        className="truncate text-[15px] font-bold text-ink hover:text-brand-700"
                      >
                        {item.title}
                      </Link>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-muted">
                      {item.category?.name ?? "Uncategorised"} · found {formatDate(item.foundAt)} ·
                      posted {timeAgo(item.createdAt)}
                    </p>
                    <p className="mt-1 text-[12.5px] font-semibold text-brand-700">
                      {item.claimCount ?? 0} claim{(item.claimCount ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Link to={`/items/${item.id}`} className="rc-btn rc-btn-outline rc-btn-sm flex-1 sm:flex-none">
                      <SearchIcon size={14} />
                      View
                    </Link>
                    {!archived && (
                      <>
                        <Link
                          to={`/items/${item.id}/edit`}
                          className="rc-btn rc-btn-outline rc-btn-sm flex-1 sm:flex-none"
                        >
                          <EditIcon size={14} />
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="rc-btn rc-btn-danger rc-btn-sm flex-1 sm:flex-none"
                          onClick={() => removeItem(item)}
                          disabled={busy === item.id}
                        >
                          {busy === item.id ? <Spinner size={13} /> : <TrashIcon size={14} />}
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex justify-center border-t border-line pt-4">
            <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => navigate("/my-claims?tab=received")}>
              See claim requests
              <ArrowRightIcon size={14} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
