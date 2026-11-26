import { useCallback, useEffect, useState } from "react";
import { api, imageUrl } from "../lib/api";
import {
  ALLOWED_IMAGE_ACCEPT,
  ALLOWED_IMAGE_LABEL,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
  MAX_IMAGES_PER_ITEM,
} from "../lib/limits";
import { formatDateTime, timeAgo } from "../lib/format";
import { Link, useLocation, useNavigate } from "../lib/router";
import usePageTitle from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import EmptyState from "../components/ui/EmptyState";
import InlineAlert from "../components/ui/InlineAlert";
import { PageLoading, Spinner } from "../components/ui/Loading";
import StatusBadge from "../components/ui/StatusBadge";
import { PhotoPlaceholder } from "../components/ui/ItemCard";
import {
  AlertIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  EditIcon,
  ImageIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from "../components/reclaim/icons";

export default function ItemPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const id = decodeURIComponent(pathname.split("/")[2] ?? "");

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);

  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState(null);

  const [claimMessage, setClaimMessage] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claimSent, setClaimSent] = useState(false);

  usePageTitle(item?.title ?? "Item");

  const canManage = Boolean(
    user && item && (user.id === item.posterId || user.role === "ADMIN"),
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get(`/items/${encodeURIComponent(id)}`)
      .then((res) => {
        if (cancelled) return;
        setItem(res.data);
        setActivePhoto(0);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadClaims = useCallback(async () => {
    if (!item || !canManage) return;
    setClaimsLoading(true);
    setClaimsError(null);
    try {
      const res = await api.get(`/items/${encodeURIComponent(item.id)}/claims`);
      setClaims(res.data ?? []);
    } catch (err) {
      setClaimsError(err.message);
    } finally {
      setClaimsLoading(false);
    }
  }, [item, canManage]);

  useEffect(() => {
    if (canManage) loadClaims();
    else {
      setClaims([]);
      setClaimsError(null);
    }
  }, [canManage, loadClaims]);

  async function refreshItem() {
    const res = await api.get(`/items/${encodeURIComponent(id)}`);
    setItem(res.data);
    setActivePhoto((current) => Math.min(current, Math.max(0, (res.data.images?.length ?? 1) - 1)));
  }

  async function markReturned() {
    setBusy("returned");
    try {
      const res = await api.patch(`/items/${encodeURIComponent(id)}`, { status: "RETURNED" });
      setItem(res.data);
      toast("Marked as returned.");
      loadClaims();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function removeItem() {
    const ok = await confirm({
      title: "Remove this post?",
      message:
        "It will be archived and disappear from the board. You can still see it under My posts.",
      confirmLabel: "Remove post",
      tone: "danger",
    });
    if (!ok) return;

    setBusy("remove");
    try {
      await api.del(`/items/${encodeURIComponent(id)}`);
      toast("Post removed.");
      navigate("/my-items");
    } catch (err) {
      toast(err.message, "error");
      setBusy(null);
    }
  }

  async function changeClaim(claimId, status) {
    setBusy(`claim-${claimId}`);
    try {
      await api.patch(`/claims/${encodeURIComponent(claimId)}`, { status });
      toast(`Claim ${status.toLowerCase()}.`);
      await Promise.all([refreshItem(), loadClaims()]);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function submitClaim(event) {
    event.preventDefault();
    const message = claimMessage.trim();
    if (message.length < 10) {
      setClaimError("Tell us a little more — at least 10 characters.");
      return;
    }
    setClaimError("");
    setBusy("claim");
    try {
      await api.post(`/items/${encodeURIComponent(id)}/claims`, { message });
      setClaimSent(true);
      setClaimMessage("");
      toast("Claim sent. The poster will review it.");
    } catch (err) {
      if (err.code === "CLAIM_EXISTS") {
        setClaimError("You already claimed this item. Check My claims for its status.");
      } else if (err.code === "ITEM_NOT_OPEN") {
        setClaimError("This item is no longer open for claims.");
      } else if (err.status === 401) {
        setClaimError("Your session expired. Log in again to send this claim.");
      } else {
        setClaimError(err.message);
      }
    } finally {
      setBusy(null);
    }
  }

  async function addPhotos(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const remaining = MAX_IMAGES_PER_ITEM - (item.images?.length ?? 0);
    if (remaining <= 0) {
      toast(`This item already has ${MAX_IMAGES_PER_ITEM} photo. Delete it first.`, "error");
      return;
    }
    if (files.length > remaining) {
      toast(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} allowed.`, "error");
      return;
    }
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast(`Photos must be ${ALLOWED_IMAGE_LABEL}.`, "error");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast(`Each photo must be ${MAX_IMAGE_LABEL} or smaller.`, "error");
        return;
      }
    }

    const form = new FormData();
    files.forEach((file) => form.append("images", file));

    setBusy("photos");
    try {
      const res = await api.submitForm(`/items/${encodeURIComponent(item.id)}/images`, form);
      setItem((current) => ({ ...current, images: res.data }));
      toast(files.length > 1 ? "Photos added." : "Photo added.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function deletePhoto(image) {
    const ok = await confirm({
      title: "Delete this photo?",
      message: "It will be removed from the post and from photo search.",
      confirmLabel: "Delete photo",
      tone: "danger",
    });
    if (!ok) return;

    setBusy(`photo-${image.id}`);
    try {
      await api.del(`/images/${encodeURIComponent(image.id)}`);
      setItem((current) => ({
        ...current,
        images: current.images.filter((entry) => entry.id !== image.id),
      }));
      setActivePhoto(0);
      toast("Photo deleted.");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <PageLoading label="Opening item…" />;

  if (error) {
    const notFound = error.status === 404;
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <EmptyState
          tone="error"
          icon={<AlertIcon size={26} />}
          title={notFound ? "We can’t find that item" : "Couldn’t open this item"}
          description={
            notFound
              ? "It may have been removed, archived, or the link is wrong."
              : error.message
          }
        >
          <Link to="/browse" className="rc-btn rc-btn-sm">
            Back to browse
          </Link>
        </EmptyState>
      </div>
    );
  }

  const photos = (item.images ?? []).map((image) => ({ ...image, src: imageUrl(image.url) }));
  const currentPhoto = photos[activePhoto];
  const isOwner = Boolean(user && user.id === item.posterId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/browse"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white/85 hover:text-white"
        >
          <ArrowLeftIcon size={15} />
          Back to browse
        </Link>
        <span className="text-[12.5px] text-white/60">Posted {timeAgo(item.createdAt)}</span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <section className="rc-panel overflow-hidden p-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-surface-soft">
            {currentPhoto?.src ? (
              <img
                src={currentPhoto.src}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <PhotoPlaceholder label="No photo yet — describe it in the claim" />
            )}

            {canManage && currentPhoto && (
              <button
                type="button"
                className="absolute top-3 right-3 flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-white/95 text-danger shadow-sm transition-colors hover:bg-danger-soft"
                onClick={() => deletePhoto(currentPhoto)}
                disabled={busy === `photo-${currentPhoto.id}`}
                aria-label="Delete this photo"
                title="Delete this photo"
              >
                <TrashIcon size={16} />
              </button>
            )}

            {photos.length > 1 && (
              <span className="absolute bottom-3 left-3 rounded-full bg-[rgb(6_20_70/0.65)] px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                {activePhoto + 1} / {photos.length}
              </span>
            )}
          </div>

          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className={`size-16 flex-none cursor-pointer overflow-hidden rounded-xl ring-2 transition-all ${
                    index === activePhoto ? "ring-brand-600" : "ring-transparent hover:ring-brand-500/40"
                  }`}
                  onClick={() => setActivePhoto(index)}
                  aria-label={`Photo ${index + 1}`}
                  aria-current={index === activePhoto ? "true" : undefined}
                >
                  <img src={photo.src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {canManage && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
              <p className="text-[12.5px] text-ink-muted">
                {photos.length} of {MAX_IMAGES_PER_ITEM} · {ALLOWED_IMAGE_LABEL} · {MAX_IMAGE_LABEL} max
              </p>
              <label
                className={`rc-btn rc-btn-outline rc-btn-sm cursor-pointer ${
                  busy === "photos" || photos.length >= MAX_IMAGES_PER_ITEM
                    ? "pointer-events-none opacity-55"
                    : ""
                }`}
              >
                {busy === "photos" ? <Spinner size={14} /> : <CameraIcon size={15} />}
                Add photo
                <input
                  type="file"
                  accept={ALLOWED_IMAGE_ACCEPT}
                  hidden
                  onChange={addPhotos}
                  disabled={busy === "photos" || photos.length >= MAX_IMAGES_PER_ITEM}
                />
              </label>
            </div>
          )}
        </section>

        <section className="rc-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-soft px-3 py-1 text-[11.5px] font-extrabold tracking-wide text-brand-700 uppercase">
              {item.category?.name ?? "Uncategorised"}
            </span>
            <StatusBadge status={item.status} />
          </div>

          <h1 className="mt-3 text-[30px] leading-[1.15] font-extrabold tracking-[-0.02em] text-ink max-[900px]:text-[25px]">
            {item.title}
          </h1>

          <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap text-ink/90">
            {item.description}
          </p>

          <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[13.5px]">
            <dt className="flex items-center gap-1.5 font-semibold text-ink-muted">
              <PinIcon size={14} /> Found at
            </dt>
            <dd className="text-ink">{item.foundLocation}</dd>

            <dt className="flex items-center gap-1.5 font-semibold text-ink-muted">
              <CalendarIcon size={14} /> When
            </dt>
            <dd className="text-ink">{formatDateTime(item.foundAt)}</dd>

            <dt className="flex items-center gap-1.5 font-semibold text-ink-muted">
              <UserIcon size={14} /> Posted by
            </dt>
            <dd className="text-ink">{item.poster?.name ?? "Unknown"}</dd>

            {item.handoverNote && (
              <>
                <dt className="flex items-center gap-1.5 font-semibold text-ink-muted">
                  <ShieldIcon size={14} /> Handover
                </dt>
                <dd className="text-ink">{item.handoverNote}</dd>
              </>
            )}
          </dl>

          {canManage && (
            <>
              <div className="my-5 border-t border-line" />
              <div className="flex flex-wrap gap-2">
                <Link to={`/items/${item.id}/edit`} className="rc-btn rc-btn-outline rc-btn-sm">
                  <EditIcon size={15} />
                  Edit post
                </Link>
                {item.status !== "RETURNED" && item.status !== "ARCHIVED" && (
                  <button
                    type="button"
                    className="rc-btn rc-btn-sm"
                    onClick={markReturned}
                    disabled={busy === "returned"}
                  >
                    {busy === "returned" ? <Spinner size={14} /> : <CheckIcon size={15} />}
                    Mark as returned
                  </button>
                )}
                {item.status !== "ARCHIVED" && (
                  <button
                    type="button"
                    className="rc-btn rc-btn-danger rc-btn-sm"
                    onClick={removeItem}
                    disabled={busy === "remove"}
                  >
                    <TrashIcon size={15} />
                    Remove post
                  </button>
                )}
              </div>
              {isOwner && (
                <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
                  Approving a claim marks this item as claimed and automatically rejects the other
                  pending claims.
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {canManage ? (
        <section className="rc-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">
              Claims{claims.length ? ` (${claims.length})` : ""}
            </h2>
            {claimsLoading && <Spinner size={16} className="text-brand-600" />}
          </div>

          {claimsError && (
            <InlineAlert className="mt-3">{claimsError}</InlineAlert>
          )}

          {!claimsLoading && !claimsError && claims.length === 0 && (
            <p className="mt-2 text-[13.5px] text-ink-muted">
              No claims yet. We’ll show them here as soon as someone says it’s theirs.
            </p>
          )}

          <ul className="mt-3 flex flex-col gap-2.5">
            {claims.map((claim) => (
              <li key={claim.id} className="rc-row items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[14.5px] text-ink">{claim.claimant?.name ?? "Someone"}</strong>
                    <StatusBadge status={claim.status} />
                    <span className="text-[11.5px] text-ink-muted">{timeAgo(claim.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink/90">
                    {claim.message}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-ink-muted">
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
                </div>

                {claim.status === "PENDING" && (
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <button
                      type="button"
                      className="rc-btn rc-btn-sm flex-1 sm:flex-none"
                      onClick={() => changeClaim(claim.id, "APPROVED")}
                      disabled={busy === `claim-${claim.id}` || item.status !== "OPEN"}
                      title={item.status !== "OPEN" ? "Only open items can have an approved claim" : undefined}
                    >
                      {busy === `claim-${claim.id}` ? <Spinner size={13} /> : <CheckIcon size={14} />}
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rc-btn rc-btn-outline rc-btn-sm flex-1 sm:flex-none"
                      onClick={() => changeClaim(claim.id, "REJECTED")}
                      disabled={busy === `claim-${claim.id}`}
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
      ) : item.status === "OPEN" ? (
        <section className="rc-panel p-5 sm:p-6">
          <h2 className="text-[20px] font-extrabold tracking-[-0.01em] text-ink">Is this yours?</h2>

          {claimSent ? (
            <div className="mt-3">
              <InlineAlert tone="success">
                Claim sent. The poster will review it and you’ll see the outcome in My claims.
              </InlineAlert>
              <Link to="/my-claims" className="rc-btn rc-btn-sm mt-3">
                View my claims
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          ) : user ? (
            <>
              <p className="mt-1.5 text-[13.5px] text-ink-muted">
                Prove it — describe something only the owner would know (a mark, what’s inside, a
                receipt).
              </p>
              <form className="mt-3" onSubmit={submitClaim}>
                {claimError && <InlineAlert className="mb-3">{claimError}</InlineAlert>}
                <label htmlFor="claim-message" className="rc-label">
                  Your message
                </label>
                <textarea
                  id="claim-message"
                  className="rc-field min-h-[110px] resize-y"
                  value={claimMessage}
                  onChange={(event) => setClaimMessage(event.target.value)}
                  maxLength={2000}
                  placeholder="It’s my black wallet — there’s a metro card and a photo of my dog inside."
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] text-ink-muted">
                    {claimMessage.trim().length}/10 characters minimum
                  </span>
                  <button
                    type="submit"
                    className="rc-btn"
                    disabled={busy === "claim" || claimMessage.trim().length < 10}
                  >
                    {busy === "claim" ? <Spinner size={14} /> : <CheckIcon size={15} />}
                    Send claim
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-[13.5px] text-ink-muted">
                Log in to send a claim with proof of ownership.
              </p>
              <Link
                to={`/login?next=${encodeURIComponent(`/items/${item.id}`)}`}
                className="rc-btn mt-3"
              >
                Log in to claim
                <ArrowRightIcon size={14} />
              </Link>
            </>
          )}
        </section>
      ) : (
        <section className="rc-panel p-5 sm:p-6">
          <h2 className="text-[18px] font-extrabold text-ink">This item is {item.status.toLowerCase()}</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-muted">
            It’s no longer open for new claims. Browse the board for other finds.
          </p>
          <Link to="/browse" className="rc-btn rc-btn-outline rc-btn-sm mt-3">
            Browse items
            <ArrowRightIcon size={14} />
          </Link>
        </section>
      )}

      <div className="pb-2">
        <Link
          to="/browse"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/70 hover:text-white"
        >
          <ImageIcon size={14} />
          See more found items
        </Link>
      </div>
    </div>
  );
}
