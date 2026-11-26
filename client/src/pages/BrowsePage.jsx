import { useEffect, useMemo, useRef, useState } from "react";
import { api, toQuery } from "../lib/api";
import {
  ALLOWED_IMAGE_ACCEPT,
  ALLOWED_IMAGE_LABEL,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
} from "../lib/limits";
import { peekPendingImage, setPendingImage, clearPendingImage } from "../lib/photoSearch";
import { useNavigate, useSearchParams } from "../lib/router";
import usePageTitle from "../lib/usePageTitle";
import ItemCard from "../components/ui/ItemCard";
import { CardGridSkeleton } from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import Pagination from "../components/ui/Pagination";
import {
  ArrowRightIcon,
  CameraIcon,
  FilterIcon,
  ImageIcon,
  SearchIcon,
  SparkleIcon,
  TagIcon,
  XIcon,
} from "../components/reclaim/icons";

const STATUS_TABS = [
  { value: "OPEN", label: "Open" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "RETURNED", label: "Returned" },
];

const LIMIT = 12;

const readParams = (params) => ({
  q: (params.get("q") ?? "").trim(),
  mode: params.get("mode") ?? "",
  status: params.get("status") || "OPEN",
  category: params.get("category") || "",
  page: Math.max(1, Number(params.get("page")) || 1),
});

export default function BrowsePage() {
  const params = useSearchParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const current = useMemo(() => readParams(params), [params]);
  const { q, status, category, page } = current;
  const requestedSemantic = current.mode === "semantic";
  const isImage = current.mode === "image";

  usePageTitle(isImage ? "Photo search" : q ? `Search: ${q}` : "Browse found items");

  const [queryInput, setQueryInput] = useState(q);
  const [smart, setSmart] = useState(requestedSemantic);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [photo, setPhoto] = useState(() => peekPendingImage());

  // Keep the controls in sync with the URL (back/forward, shared links).
  useEffect(() => {
    setQueryInput(q);
    setSmart(requestedSemantic);
  }, [q, requestedSemantic]);

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

  const paramsKey = params.toString();

  useEffect(() => {
    const search = new URLSearchParams(paramsKey);
    const values = readParams(search);
    const imageMode = values.mode === "image";
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (imageMode && !photo) {
        setResult({ data: [], total: 0, limit: 20, page: 1, searchMode: "image" });
        setLoading(false);
        return;
      }

      try {
        let response;

        if (imageMode) {
          const form = new FormData();
          form.append("image", photo);
          response = await api.submitForm(
            `/items/search-image${toQuery({
              category: values.category,
              status: values.status,
              limit: 20,
            })}`,
            form,
          );
        } else {
          response = await api.get(
            `/items${toQuery({
              q: values.q,
              mode: values.q ? (values.mode === "semantic" ? "semantic" : "keyword") : undefined,
              category: values.category,
              status: values.status,
              page: values.page,
              limit: LIMIT,
            })}`,
          );
        }

        if (!cancelled) {
          setResult(response);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        if (imageMode && err.status === 503) {
          setError({
            title: "Photo search is unavailable right now",
            message:
              "The AI service is offline or still starting up. You can still search by text or browse everything that’s been handed in.",
            status: 503,
          });
        } else {
          setError({
            title: err.status === 0 ? "Server unreachable" : "That search didn’t work",
            message: err.message,
            status: err.status,
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [paramsKey, photo, nonce]);

  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : ""), [photo]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function browseUrl(overrides = {}) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === null || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    const qs = next.toString();
    return `/browse${qs ? `?${qs}` : ""}`;
  }

  function submitSearch(event) {
    event.preventDefault();
    const trimmed = queryInput.trim();
    if (!trimmed) {
      if (photo) {
        navigate(browseUrl({ mode: "image", page: 1 }));
      }
      return;
    }
    if (photo) setPhoto(null);
    navigate(
      browseUrl({
        q: trimmed,
        mode: smart ? "semantic" : "keyword",
        page: 1,
      }),
    );
  }

  function pickPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError({
        title: "That photo won’t work",
        message: `Photo search needs a ${ALLOWED_IMAGE_LABEL} image.`,
        status: 400,
      });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError({
        title: "That photo is too large",
        message: `Photo search images must be ${MAX_IMAGE_LABEL} or smaller.`,
        status: 400,
      });
      return;
    }

    setPhoto(file);
    setPendingImage(file);
    const next = browseUrl({ mode: "image", page: 1 });
    if (next === browseUrl()) setNonce((value) => value + 1);
    else navigate(next);
  }

  function clearPhotoSearch() {
    setPhoto(null);
    clearPendingImage();
    navigate(browseUrl({ mode: q ? "keyword" : undefined, page: 1 }));
  }

  const totalPages = result ? Math.max(1, Math.ceil((result.total ?? 0) / (result.limit || LIMIT))) : 1;
  const showSmartFallback = !isImage && requestedSemantic && q && result?.searchMode === "keyword";
  const activeCategory = categories.find((entry) => entry.slug === category);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Found items"
        title={q ? `Results for “${q}”` : "Browse the found board"}
        description={
          q
            ? "Every result was handed in by someone on campus. Spot yours? Open it and send a claim with proof."
            : "Everything people have picked up and posted. Filter by category or status, or search with words or a photo."
        }
        actions={
          <button type="button" className="rc-btn rc-btn-light rc-btn-sm" onClick={() => navigate("/report")}>
            Report a find
            <ArrowRightIcon size={15} />
          </button>
        }
      />

      <section className="rc-panel p-3.5 sm:p-4">
        <form onSubmit={submitSearch} role="search">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-soft py-1.5 pr-2 pl-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-500/50">
              <SearchIcon size={18} className="flex-none text-ink-muted" />
              <label htmlFor="browse-q" className="sr-only">
                Search found items
              </label>
              <input
                id="browse-q"
                type="search"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                maxLength={200}
                placeholder="black charger, blue bottle, keys…"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent py-2 pr-1 text-[15px] text-ink outline-none placeholder:text-ink-muted"
              />
              {queryInput && (
                <button
                  type="button"
                  className="flex size-7 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-[#e1e9f9] text-ink-muted hover:bg-[#d4e0f7]"
                  onClick={() => setQueryInput("")}
                  aria-label="Clear search text"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ALLOWED_IMAGE_ACCEPT}
                hidden
                onChange={pickPhoto}
              />
              <button
                type="button"
                className={`rc-btn rc-btn-outline flex-1 sm:flex-none ${
                  isImage ? "border-brand-600 text-brand-700" : ""
                }`}
                onClick={() => fileRef.current?.click()}
                title="Search by photo"
              >
                <CameraIcon size={17} />
                <span className="sm:hidden">Photo</span>
              </button>
              <button type="submit" className="rc-btn flex-1 sm:flex-none">
                Search
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink-muted">
              <input
                type="checkbox"
                checked={smart}
                onChange={(event) => setSmart(event.target.checked)}
                disabled={isImage}
                className="size-4 cursor-pointer rounded"
              />
              <span className="inline-flex items-center gap-1.5">
                <SparkleIcon size={13} className="text-brand-600" />
                Smart search
                <span className="font-normal text-ink-muted/80">(matches similar words)</span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Item status">
              <FilterIcon size={14} className="mr-0.5 text-ink-muted" />
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className="rc-chip-light"
                  aria-current={status === tab.value ? "true" : undefined}
                  onClick={() => navigate(browseUrl({ status: tab.value, page: 1 }))}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>

      {isImage && (
        <section className="rc-panel flex flex-wrap items-center gap-4 p-4">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Your search"
              className="size-16 flex-none rounded-xl object-cover ring-1 ring-line"
            />
          ) : (
            <span className="flex size-16 flex-none items-center justify-center rounded-xl bg-surface-soft text-ink-muted">
              <ImageIcon size={26} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold tracking-wide text-brand-700 uppercase">
              Photo search
            </p>
            <p className="truncate text-[14px] text-ink-muted">
              {photo ? photo.name : "Choose a photo to compare against every item that has one."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!photo && (
              <button type="button" className="rc-btn rc-btn-sm" onClick={() => fileRef.current?.click()}>
                <CameraIcon size={15} />
                Choose photo
              </button>
            )}
            <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={clearPhotoSearch}>
              Use text search
            </button>
          </div>
        </section>
      )}

      <div className="rc-scroll-x -mx-1 flex flex-wrap gap-2 px-1 max-sm:flex-nowrap">
        <button
          type="button"
          className="rc-chip flex-none"
          aria-current={!category ? "true" : undefined}
          onClick={() => navigate(browseUrl({ category: "", page: 1 }))}
        >
          <TagIcon size={13} />
          All
        </button>
        {categories.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="rc-chip flex-none"
            aria-current={category === entry.slug ? "true" : undefined}
            onClick={() => navigate(browseUrl({ category: entry.slug, page: 1 }))}
          >
            {entry.name}
            <span className="text-[10.5px] opacity-70">{entry.itemCount}</span>
          </button>
        ))}
      </div>

      {!loading && result && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-white/80">
          <p>
            {result.total === 0
              ? "No items found"
              : `${result.total} item${result.total === 1 ? "" : "s"}${
                  activeCategory ? ` in ${activeCategory.name}` : ""
                }`}
          </p>
          {isImage && result.data?.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-glass px-3 py-1 font-semibold">
              <SparkleIcon size={12} />
              Best photo matches first
            </span>
          )}
          {!isImage && result.searchMode === "semantic" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-glass px-3 py-1 font-semibold">
              <SparkleIcon size={12} />
              AI-ranked matches
            </span>
          )}
        </div>
      )}

      {showSmartFallback && (
        <p className="rounded-2xl border border-white/25 bg-glass px-4 py-2.5 text-[13px] text-white/85">
          Smart search is offline, so these are keyword matches. Everything still works — results
          just match the exact words you typed.
        </p>
      )}

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : error ? (
        <EmptyState
          tone="error"
          icon={<ImageIcon size={26} />}
          title={error.title}
          description={error.message}
        >
          <button type="button" className="rc-btn rc-btn-sm" onClick={clearPhotoSearch}>
            Search by text
          </button>
          <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => setNonce((n) => n + 1)}>
            Try again
          </button>
        </EmptyState>
      ) : result?.data?.length ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          {!isImage && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(nextPage) => navigate(browseUrl({ page: nextPage }))}
            />
          )}
        </>
      ) : (
        <EmptyState
          icon={<SearchIcon size={26} />}
          title={isImage ? "No photo matches yet" : "Nothing matches that search"}
          description={
            isImage
              ? "Only items with photos can match a photo search, and weak matches are trimmed. Try a clearer photo, or search by words."
              : q || category
                ? "Try fewer words, another category, or turn on Smart search to match similar wording."
                : "No items in this list yet. If you found something, put it on the board."
          }
        >
          {isImage && (
            <button type="button" className="rc-btn rc-btn-sm" onClick={clearPhotoSearch}>
              Search by text
            </button>
          )}
          <button type="button" className="rc-btn rc-btn-outline rc-btn-sm" onClick={() => navigate("/report")}>
            Report a find
          </button>
        </EmptyState>
      )}
    </div>
  );
}
