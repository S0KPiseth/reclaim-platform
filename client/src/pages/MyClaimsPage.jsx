import { useEffect, useState } from "react";
import { api, imageUrl } from "../lib/api";
import { formatDate, timeAgo } from "../lib/format";
import { Link, useNavigate, useSearchParams } from "../lib/router";
import usePageTitle from "../lib/usePageTitle";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import EmptyState from "../components/ui/EmptyState";
import InlineAlert from "../components/ui/InlineAlert";
import PageHeader from "../components/ui/PageHeader";
import StatusBadge from "../components/ui/StatusBadge";
import { PageLoading, Spinner } from "../components/ui/Loading";
import { PhotoPlaceholder } from "../components/ui/ItemCard";
import {
  AlertIcon,
  CheckIcon,
  InboxIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  XIcon,
} from "../components/reclaim/icons";

const TABS = [
  { value: "mine", label: "My claims" },
  { value: "received", label: "Requests on my finds" },
];

export default function MyClaimsPage() {
  const params = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const tab = params.get("tab") === "received" ? "received" : "mine";
  usePageTitle(tab === "received" ? "Claim requests" : "My claims");

  const [mine, setMine] = useState(null);
  const [mineLoading, setMineLoading] = useState(true);
  const [mineError, setMineError] = useState(null);
  const [mineNonce, setMineNonce] = useState(0);

  const [received, setReceived] = useState(null);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [receivedError, setReceivedError] = useState(null);

  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setMineLoading(true);
    setMineError(null);
    api
      .get("/claims/mine")
      .then((res) => {
        if (!cancelled) setMine(res.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setMineError(err);
      })
      .finally(() => {
        if (!cancelled) setMineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mineNonce]);

  useEffect(() => {
    if (tab !== "received") return undefined;

    let cancelled = false;
    setReceivedLoading(true);
    setReceivedError(null);

    (async () => {
      try {
        const itemsRes = await api.get("/items/mine");
        const items = itemsRes.data ?? [];

        const withClaims = await Promise.all(
          items.map(async (item) => {
            const claimsRes = await api.get(`/items/${encodeURIComponent(item.id)}/claims`);
            return { item, claims: claimsRes.data ?? [] };
          }),
        );

        if (!cancelled) {
          setReceived(withClaims.filter((entry) => entry.claims.length > 0));
        }
      } catch (err) {
        if (!cancelled) setReceivedError(err);
      } finally {
        if (!cancelled) setReceivedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function reloadReceived() {
    setReceivedLoading(true);
    try {
      const itemsRes = await api.get("/items/mine");
      const withClaims = await Promise.all(
        (itemsRes.data ?? []).map(async (item) => {
          const claimsRes = await api.get(`/items/${encodeURIComponent(item.id)}/claims`);
          return { item, claims: claimsRes.data ?? [] };
        }),
      );
      setReceived(withClaims.filter((entry) => entry.claims.length > 0));
    } catch (err) {
      setReceivedError(err);
    } finally {
      setReceivedLoading(false);
    }
  }

  async function withdraw(claim) {
    const ok = await confirm({
      title: "Withdraw this claim?",
      message: "The poster won’t see it any more. You can claim again only if the item is still open.",
      confirmLabel: "Withdraw",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(claim.id);
    try {
      const res = await api.patch(`/claims/${encodeURIComponent(claim.id)}`, {
        status: "WITHDRAWN",
      });
      setMine((current) =>
        current.map((entry) => (entry.id === claim.id ? { ...entry, status: res.data.status } : entry)),
      );
      toast("Claim withdrawn.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function decide(claim, status) {
    setBusy(claim.id);
    try {
      await api.patch(`/claims/${encodeURIComponent(claim.id)}`, { status });
      toast(`Claim ${status.toLowerCase()}.`);
      await reloadReceived();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  function switchTab(next) {
    navigate(next === "received" ? "/my-claims?tab=received" : "/my-claims");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Claims"
        title={tab === "received" ? "Requests on my finds" : "My claims"}
        description={
          tab === "received"
            ? "People who think your finds are theirs. Approving one marks the item claimed and rejects the others."
            : "Claims you’ve sent. When a poster approves one, their contact details appear here."
        }
        actions={
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                className="rc-chip"
                aria-current={tab === entry.value ? "true" : undefined}
                onClick={() => switchTab(entry.value)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        }
      />

      {tab === "mine" ? (
        mineLoading ? (
          <PageLoading label="Loading your claims…" />
        ) : mineError ? (
          <EmptyState tone="error" icon={<AlertIcon size={26} />} title="Couldn’t load your claims" description={mineError.message}>
            <button type="button" className="rc-btn rc-btn-sm" onClick={() => setMineNonce((value) => value + 1)}>
              Try again
            </button>
          </EmptyState>
        ) : mine.length === 0 ? (
          <EmptyState
            icon={<InboxIcon size={26} />}
            title="No claims yet"
            description="See something that’s yours? Open it, prove ownership, and send a claim."
          >
            <Link to="/browse" className="rc-btn rc-btn-sm">
              <SearchIcon size={15} />
              Browse items
            </Link>
          </EmptyState>
        ) : (
          <section className="rc-panel p-4 sm:p-5">
            <ul className="flex flex-col gap-2.5">
              {mine.map((claim) => {
                const photo = claim.item?.images?.[0]
                  ? imageUrl(claim.item.images[0].url)
                  : "";
                return (
                  <li key={claim.id} className="rc-row items-start">
                    <Link
                      to={`/items/${claim.item.id}`}
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
                          to={`/items/${claim.item.id}`}
                          className="truncate text-[15px] font-bold text-ink hover:text-brand-700"
                        >
                          {claim.item?.title ?? "Item"}
                        </Link>
                        <StatusBadge status={claim.status} />
                        <span className="text-[11.5px] text-ink-muted">{timeAgo(claim.createdAt)}</span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink/80">
                        {claim.message}
                      </p>

                      <p className="mt-1 text-[12px] text-ink-muted">
                        {claim.item?.category?.name ?? "Uncategorised"} · found{" "}
                        {formatDate(claim.item?.foundAt)}
                        {claim.item?.poster?.name ? ` · posted by ${claim.item.poster.name}` : ""}
                      </p>

                      {claim.posterContact && (
                        <p className="mt-2 rounded-xl bg-[#f1fdf7] px-3 py-2 text-[12.5px] font-semibold text-[#0f7a4a]">
                          Approved — contact {claim.item?.poster?.name ?? "the poster"}:{" "}
                          {claim.posterContact.email}
                          {claim.posterContact.phone ? ` · ${claim.posterContact.phone}` : ""}
                        </p>
                      )}
                    </div>

                    {claim.status === "PENDING" && (
                      <button
                        type="button"
                        className="rc-btn rc-btn-danger rc-btn-sm w-full sm:w-auto"
                        onClick={() => withdraw(claim)}
                        disabled={busy === claim.id}
                      >
                        {busy === claim.id ? <Spinner size={13} /> : <XIcon size={14} />}
                        Withdraw
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )
      ) : receivedLoading ? (
        <PageLoading label="Loading claim requests…" />
      ) : receivedError ? (
        <EmptyState tone="error" icon={<AlertIcon size={26} />} title="Couldn’t load claim requests" description={receivedError.message}>
          <button type="button" className="rc-btn rc-btn-sm" onClick={reloadReceived}>
            Try again
          </button>
        </EmptyState>
      ) : !received || received.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size={26} />}
          title="No claim requests yet"
          description="When someone claims one of your finds it will appear here. You can also open the post itself."
        >
          <Link to="/my-items" className="rc-btn rc-btn-sm">
            My posts
          </Link>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {received.map(({ item, claims }) => (
            <section key={item.id} className="rc-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/items/${item.id}`}
                  className="text-[16px] font-extrabold text-ink hover:text-brand-700"
                >
                  {item.title}
                </Link>
                <StatusBadge status={item.status} />
                <span className="text-[12px] text-ink-muted">
                  {claims.length} claim{claims.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="mt-3 flex flex-col gap-2.5">
                {claims.map((claim) => (
                  <li key={claim.id} className="rounded-2xl border border-line bg-surface-soft/70 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-[14px] text-ink">{claim.claimant?.name ?? "Someone"}</strong>
                      <StatusBadge status={claim.status} />
                      <span className="text-[11.5px] text-ink-muted">{timeAgo(claim.createdAt)}</span>
                    </div>

                    <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap text-ink/85">
                      {claim.message}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-ink-muted">
                      {claim.claimant?.email && (
                        <span className="inline-flex items-center gap-1.5">
                          <MailIcon size={12} />
                          {claim.claimant.email}
                        </span>
                      )}
                      {claim.claimant?.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <PhoneIcon size={12} />
                          {claim.claimant.phone}
                        </span>
                      )}
                    </div>

                    {claim.status === "PENDING" && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rc-btn rc-btn-sm"
                          onClick={() => decide(claim, "APPROVED")}
                          disabled={busy === claim.id || item.status !== "OPEN"}
                          title={item.status !== "OPEN" ? "Only open items can have an approved claim" : undefined}
                        >
                          {busy === claim.id ? <Spinner size={13} /> : <CheckIcon size={14} />}
                          Approve
                        </button>
                        <button
                          type="button"
                          className="rc-btn rc-btn-outline rc-btn-sm"
                          onClick={() => decide(claim, "REJECTED")}
                          disabled={busy === claim.id}
                        >
                          <XIcon size={14} />
                          Reject
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <InlineAlert tone="info" className="mx-auto max-w-[640px]">
            Approving a claim marks the item claimed and automatically rejects the other pending claims.
          </InlineAlert>
        </div>
      )}
    </div>
  );
}
