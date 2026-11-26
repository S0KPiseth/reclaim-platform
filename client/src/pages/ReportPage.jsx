import { useEffect, useMemo, useState } from "react";
import { api, imageUrl } from "../lib/api";
import {
  ALLOWED_IMAGE_ACCEPT,
  ALLOWED_IMAGE_LABEL,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
  MAX_IMAGES_PER_ITEM,
} from "../lib/limits";
import { nowLocalInput, toLocalInput } from "../lib/format";
import { Link, useLocation, useNavigate } from "../lib/router";
import usePageTitle from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import InlineAlert from "../components/ui/InlineAlert";
import { PageLoading, Spinner } from "../components/ui/Loading";
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
} from "../components/reclaim/icons";

const EMPTY = {
  title: "",
  description: "",
  category: "",
  foundLocation: "",
  foundAt: "",
  handoverNote: "",
};

function validate(values, totalPhotos) {
  if (values.title.trim().length < 3) return "Title must be at least 3 characters.";
  if (values.description.trim().length < 10)
    return "Description must be at least 10 characters — the more detail, the easier it is to match.";
  if (values.category.trim().length < 2) return "Choose or type a category.";
  if (!values.foundLocation.trim()) return "Tell people where you found it.";
  if (!values.foundAt) return "Pick the date and time you found it.";
  if (Number.isNaN(new Date(values.foundAt).getTime())) return "That date doesn’t look right.";
  if (totalPhotos > MAX_IMAGES_PER_ITEM)
    return `You can keep at most ${MAX_IMAGES_PER_ITEM} photo.`;
  return "";
}

export default function ReportPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const editId = pathname.match(/^\/items\/([^/]+)\/edit$/)?.[1] ?? null;
  const isEdit = Boolean(editId);

  usePageTitle(isEdit ? "Edit post" : "Report a found item");

  const [values, setValues] = useState({ ...EMPTY, foundAt: nowLocalInput() });
  const [categories, setCategories] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    setFormError("");
    setRemovedIds([]);
    setNewPhotos([]);
    setExistingPhotos([]);
    setLoadError(null);

    if (!editId) {
      setValues({ ...EMPTY, foundAt: nowLocalInput() });
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    api
      .get(`/items/${encodeURIComponent(editId)}`)
      .then((res) => {
        if (cancelled) return;
        const item = res.data;

        if (user && user.id !== item.posterId && user.role !== "ADMIN") {
          toast("Only the poster or an admin can edit this post.", "error");
          navigate(`/items/${item.id}`, { replace: true });
          return;
        }

        setValues({
          title: item.title ?? "",
          description: item.description ?? "",
          category: item.category?.name ?? "",
          foundLocation: item.foundLocation ?? "",
          foundAt: toLocalInput(item.foundAt),
          handoverNote: item.handoverNote ?? "",
        });
        setExistingPhotos(item.images ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Re-run only when the target post or the signed-in account changes; the
    // user object identity can change during /auth/me bootstrap without
    // invalidating the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, user?.id, user?.role, navigate, toast]);

  const previews = useMemo(
    () => newPhotos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newPhotos],
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  const keptPhotos = existingPhotos.filter((photo) => !removedIds.includes(photo.id));
  const totalPhotos = keptPhotos.length + newPhotos.length;

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function addFiles(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const file = files[0];
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFormError(`Photos must be ${ALLOWED_IMAGE_LABEL}.`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError(`Each photo must be ${MAX_IMAGE_LABEL} or smaller.`);
      return;
    }

    setFormError("");
    // The API stores one photo per item, so a new pick replaces the stored one.
    if (isEdit) setRemovedIds(keptPhotos.map((photo) => photo.id));
    setNewPhotos([file]);
  }

  function toggleRemove(photoId) {
    setRemovedIds((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId],
    );
  }

  async function submit(event) {
    event.preventDefault();
    const message = validate(values, totalPhotos);
    if (message) {
      setFormError(message);
      return;
    }

    setFormError("");
    setSaving(true);

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
      foundLocation: values.foundLocation.trim(),
      foundAt: new Date(values.foundAt).toISOString(),
      handoverNote: values.handoverNote.trim() || null,
    };

    try {
      if (isEdit) {
        await api.patch(`/items/${encodeURIComponent(editId)}`, payload);

        if (removedIds.length) {
          await Promise.all(
            removedIds.map((photoId) => api.del(`/images/${encodeURIComponent(photoId)}`)),
          );
        }

        if (newPhotos.length) {
          const form = new FormData();
          newPhotos.forEach((file) => form.append("images", file));
          await api.submitForm(`/items/${encodeURIComponent(editId)}/images`, form);
        }

        toast("Changes saved.");
        navigate(`/items/${encodeURIComponent(editId)}`);
      } else {
        const form = new FormData();
        form.append("title", payload.title);
        form.append("description", payload.description);
        form.append("category", payload.category);
        form.append("foundLocation", payload.foundLocation);
        form.append("foundAt", payload.foundAt);
        if (payload.handoverNote) form.append("handoverNote", payload.handoverNote);
        newPhotos.forEach((file) => form.append("images", file));

        const res = await api.submitForm("/items", form);
        toast("Posted. Thanks for picking it up!");
        navigate(`/items/${res.data.id}`);
      }
    } catch (err) {
      setFormError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <PageLoading label="Opening the post…" />;

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="rc-panel max-w-[520px] p-6 text-center">
          <h1 className="text-[22px] font-extrabold text-ink">Couldn’t open that post</h1>
          <p className="mt-2 text-[14px] text-ink-muted">{loadError.message}</p>
          <Link to="/my-items" className="rc-btn rc-btn-sm mt-5">
            Back to my posts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <Link
        to={isEdit ? `/items/${editId}` : "/browse"}
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white/85 hover:text-white"
      >
        <ArrowLeftIcon size={15} />
        {isEdit ? "Back to the post" : "Back to browse"}
      </Link>

      <section className="rc-panel p-5 sm:p-7">
        <p className="text-[11px] font-extrabold tracking-[0.2em] text-brand-600 uppercase">
          {isEdit ? "Edit post" : "Report a find"}
        </p>
        <h1 className="mt-1 text-[28px] leading-tight font-extrabold tracking-[-0.02em] text-ink max-[900px]:text-[23px]">
          {isEdit ? "Update what you found" : "Tell us what you found"}
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
          Good detail helps the owner recognise their item. Photos are optional, but they make photo
          search work.
        </p>

        {formError && <InlineAlert className="mt-4">{formError}</InlineAlert>}

        <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
          <div>
            <label htmlFor="title" className="rc-label">
              Title
            </label>
            <input
              id="title"
              className="rc-field"
              maxLength={150}
              value={values.title}
              onChange={(event) => setField("title", event.target.value)}
              placeholder="Black wallet with a metro card inside"
            />
          </div>

          <div>
            <label htmlFor="description" className="rc-label">
              Description
            </label>
            <textarea
              id="description"
              className="rc-field min-h-[130px] resize-y"
              maxLength={5000}
              value={values.description}
              onChange={(event) => setField("description", event.target.value)}
              placeholder="Where exactly, what it looks like, any marks or contents that would prove ownership."
            />
            <p className="mt-1 text-[12px] text-ink-muted">
              At least 10 characters. {values.description.trim().length}/5000
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="rc-label">
                Category
              </label>
              <input
                id="category"
                className="rc-field"
                list="category-options"
                maxLength={40}
                value={values.category}
                onChange={(event) => setField("category", event.target.value)}
                placeholder="Wallet, keys, charger…"
              />
              <datalist id="category-options">
                {categories.map((entry) => (
                  <option key={entry.id} value={entry.name} />
                ))}
              </datalist>
              <p className="mt-1 text-[12px] text-ink-muted">
                Pick an existing one or type a new category.
              </p>
            </div>

            <div>
              <label htmlFor="foundAt" className="rc-label">
                When did you find it?
              </label>
              <input
                id="foundAt"
                type="datetime-local"
                className="rc-field"
                max={nowLocalInput()}
                value={values.foundAt}
                onChange={(event) => setField("foundAt", event.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="foundLocation" className="rc-label">
              Where did you find it?
            </label>
            <input
              id="foundLocation"
              className="rc-field"
              maxLength={200}
              value={values.foundLocation}
              onChange={(event) => setField("foundLocation", event.target.value)}
              placeholder="Main library, 1st floor entrance"
            />
          </div>

          <div>
            <label htmlFor="handoverNote" className="rc-label">
              Handover note <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="handoverNote"
              className="rc-field"
              maxLength={1000}
              value={values.handoverNote}
              onChange={(event) => setField("handoverNote", event.target.value)}
              placeholder="Held at the front desk, ask for Sam."
            />
          </div>

          <div>
            <span className="rc-label">
              Photos{" "}
              <span className="font-normal text-ink-muted">
                (optional · up to {MAX_IMAGES_PER_ITEM})
              </span>
            </span>

            {(keptPhotos.length > 0 || newPhotos.length > 0) && (
              <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {existingPhotos.map((photo) => {
                  const removed = removedIds.includes(photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={`relative aspect-square overflow-hidden rounded-xl ring-1 ring-line ${
                        removed ? "opacity-35" : ""
                      }`}
                    >
                      <img
                        src={imageUrl(photo.url)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-white/95 text-ink shadow-sm hover:bg-danger-soft hover:text-danger"
                        onClick={() => toggleRemove(photo.id)}
                        aria-label={removed ? "Keep this photo" : "Remove this photo"}
                        title={removed ? "Keep this photo" : "Remove this photo"}
                      >
                        {removed ? <CheckIcon size={12} /> : <XIcon size={12} />}
                      </button>
                      {removed && (
                        <span className="absolute inset-x-0 bottom-0 bg-[rgb(6_20_70/0.7)] py-0.5 text-center text-[10px] font-bold text-white">
                          Removed
                        </span>
                      )}
                    </div>
                  );
                })}

                {previews.map((preview) => (
                  <div
                    key={preview.url}
                    className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-line"
                  >
                    <img src={preview.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-white/95 text-ink shadow-sm hover:bg-danger-soft hover:text-danger"
                      onClick={() =>
                        setNewPhotos((current) => current.filter((file) => file !== preview.file))
                      }
                      aria-label="Remove this photo"
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface-soft px-5 py-6 text-center transition-colors hover:border-brand-500 hover:bg-tint/60 ${
                totalPhotos >= MAX_IMAGES_PER_ITEM ? "pointer-events-none opacity-55" : ""
              }`}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                <UploadIcon size={18} />
              </span>
              <span className="text-[13.5px] font-semibold text-ink">
                {totalPhotos >= MAX_IMAGES_PER_ITEM
                  ? "Maximum photo reached — remove it to replace"
                  : "Click to add a photo"}
              </span>
              <span className="text-[12px] text-ink-muted">
                {ALLOWED_IMAGE_LABEL} · {MAX_IMAGE_LABEL} max · {totalPhotos}/
                {MAX_IMAGES_PER_ITEM} used
              </span>
              <input
                type="file"
                accept={ALLOWED_IMAGE_ACCEPT}
                hidden
                onChange={addFiles}
                disabled={totalPhotos >= MAX_IMAGES_PER_ITEM}
              />
            </label>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[12px] text-ink-muted">
              <CameraIcon size={13} className="mr-1 inline" />
              Posters see claims and can approve the rightful owner.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to={isEdit ? `/items/${editId}` : "/browse"} className="rc-btn rc-btn-outline">
                Cancel
              </Link>
              <button type="submit" className="rc-btn" disabled={saving}>
                {saving ? <Spinner size={14} /> : <CheckIcon size={15} />}
                {saving ? "Saving…" : isEdit ? "Save changes" : "Post it"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <p className="mt-4 flex items-center gap-1.5 text-[12px] text-white/60">
        <ImageIcon size={13} />
        Photos are public. Don’t post images of ID documents or anything private.
      </p>
    </div>
  );
}
