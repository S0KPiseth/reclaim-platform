import { useEffect, useRef, useState } from "react";
import { api, toQuery } from "../../lib/api";
import { setPendingImage } from "../../lib/photoSearch";
import {
  ALLOWED_IMAGE_ACCEPT,
  ALLOWED_IMAGE_LABEL,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
} from "../../lib/limits";
import { useNavigate } from "../../lib/router";
import {
  ArrowUpIcon,
  CameraIcon,
  FilterIcon,
  TagIcon,
  XIcon,
} from "./icons";

const DEFAULT_SUGGESTIONS = ["Black wallet", "House keys", "AirPods case", "Student ID card"];

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open finds" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "RETURNED", label: "Returned" },
];

const pillClass =
  "flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border-none px-4 font-[inherit] text-sm leading-[inherit] font-semibold transition-colors max-[900px]:hidden";

/**
 * Landing search bar. Text searches go to /browse with AI (semantic) ranking;
 * a chosen photo is handed to /browse, which calls POST /items/search-image.
 */
export default function SearchPrompt({ suggestions = DEFAULT_SUGGESTIONS }) {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const formRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState(null);

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
    if (!menu) return;
    const close = (event) => {
      if (!formRef.current?.contains(event.target)) setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  const activeCategory = categories.find((entry) => entry.slug === category);
  const activeStatus = STATUS_OPTIONS.find((entry) => entry.value === status);

  function submit(event) {
    event.preventDefault();
    setMenu(null);

    if (photo) {
      setPendingImage(photo);
      navigate(
        `/browse${toQuery({ mode: "image", status, category, page: 1 })}`,
      );
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    navigate(
      `/browse${toQuery({ q: trimmed, mode: "semantic", category, status, page: 1 })}`,
    );
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      event.target.value = "";
      setPhotoError(`Photo search needs a ${ALLOWED_IMAGE_LABEL} image.`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      event.target.value = "";
      setPhotoError(`Photo search images must be ${MAX_IMAGE_LABEL} or smaller.`);
      return;
    }

    setPhotoError("");
    setPhoto(file);
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="relative z-1 mx-auto flex w-full max-w-[900px] flex-col gap-3">
      <form
        ref={formRef}
        className="relative flex h-[68px] items-center gap-2.5 rounded-full bg-white px-2.5 shadow-[0_20px_50px_rgb(4_20_80/0.35)] focus-within:shadow-[0_20px_50px_rgb(4_20_80/0.35),0_0_0_3px_rgb(255_255_255/0.5)] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-brand-600"
        onSubmit={submit}
        role="search"
      >
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_IMAGE_ACCEPT}
          hidden
          onChange={handlePhoto}
        />
        <button
          type="button"
          className={`flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-none transition-colors ${
            photo ? "bg-brand-600 text-white" : "bg-tint text-brand-600 hover:bg-[#dbe8ff]"
          }`}
          aria-label={photo ? `Photo added: ${photo.name}. Change photo` : "Search by photo"}
          title={photo ? photo.name : "Search by photo"}
          onClick={() => fileRef.current?.click()}
        >
          <CameraIcon size={22} />
        </button>

        <label htmlFor="lost-item" className="sr-only">
          Describe your lost item
        </label>
        <input
          ref={inputRef}
          id="lost-item"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Describe what you lost… e.g. black wallet, left on the bus yesterday"
          autoComplete="off"
          className="min-w-0 flex-1 border-none bg-transparent px-2 font-[inherit] text-[16px] leading-[inherit] text-ink outline-none placeholder:text-ink-muted placeholder:opacity-100 max-[900px]:text-[15px]"
        />

        <div className="relative">
          <button
            type="button"
            className={`${pillClass} ${
              category
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-tint text-brand-600 hover:bg-[#dbe8ff]"
            }`}
            onClick={() => setMenu(menu === "category" ? null : "category")}
            aria-haspopup="menu"
            aria-expanded={menu === "category"}
          >
            <TagIcon size={16} />
            {activeCategory ? activeCategory.name : "Category"}
          </button>
          {menu === "category" && (
            <div
              role="menu"
              className="rc-scroll-x absolute top-[calc(100%+10px)] right-0 z-30 max-h-[260px] w-[230px] overflow-y-auto rounded-2xl border border-line bg-white p-1.5 text-ink shadow-[0_20px_45px_rgb(4_20_80/0.35)]"
            >
              {[{ slug: "", name: "All categories" }, ...categories].map((entry) => (
                <button
                  key={entry.slug || "all"}
                  type="button"
                  role="menuitemradio"
                  aria-checked={category === entry.slug}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] font-semibold hover:bg-surface-soft ${
                    category === entry.slug ? "bg-tint text-brand-700" : "text-ink"
                  }`}
                  onClick={() => {
                    setCategory(entry.slug);
                    setMenu(null);
                  }}
                >
                  <span className="truncate">{entry.name}</span>
                  {entry.itemCount != null && (
                    <span className="text-[11px] font-bold text-ink-muted">{entry.itemCount}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className={`${pillClass} ${
              status !== "OPEN"
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-tint text-brand-600 hover:bg-[#dbe8ff]"
            }`}
            onClick={() => setMenu(menu === "status" ? null : "status")}
            aria-haspopup="menu"
            aria-expanded={menu === "status"}
          >
            <FilterIcon size={16} />
            {activeStatus?.label ?? "Open finds"}
          </button>
          {menu === "status" && (
            <div
              role="menu"
              className="absolute top-[calc(100%+10px)] right-0 z-30 w-[200px] rounded-2xl border border-line bg-white p-1.5 text-ink shadow-[0_20px_45px_rgb(4_20_80/0.35)]"
            >
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={status === option.value}
                  className={`flex w-full cursor-pointer items-center rounded-xl px-3 py-2 text-left text-[13.5px] font-semibold hover:bg-surface-soft ${
                    status === option.value ? "bg-tint text-brand-700" : "text-ink"
                  }`}
                  onClick={() => {
                    setStatus(option.value);
                    setMenu(null);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-brand-600 font-[inherit] text-white transition-colors hover:bg-brand-700"
          aria-label="Search for my item"
        >
          <ArrowUpIcon size={22} />
        </button>
      </form>

      {photoError && (
        <p className="mx-auto max-w-[600px] rounded-full bg-white/15 px-4 py-2 text-[12.5px] font-semibold text-white">
          {photoError}
        </p>
      )}

      {photo && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rc-glass inline-flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 text-[12.5px] font-semibold text-white">
            <CameraIcon size={14} />
            <span className="max-w-[220px] truncate">{photo.name}</span>
            <button
              type="button"
              className="flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-white/20 text-white hover:bg-white/30"
              onClick={clearPhoto}
              aria-label="Remove photo"
            >
              <XIcon size={12} />
            </button>
          </span>
          <span className="text-[12px] text-white/70">
            We’ll compare this photo with every item that has one.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <span className="text-[13px] leading-[inherit] font-semibold text-white/88">Try:</span>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="rc-glass cursor-pointer rounded-full px-4 py-2 font-[inherit] text-[13px] leading-[inherit] font-semibold text-white hover:bg-glass-strong"
            onClick={() => {
              setQuery(suggestion);
              inputRef.current?.focus();
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
