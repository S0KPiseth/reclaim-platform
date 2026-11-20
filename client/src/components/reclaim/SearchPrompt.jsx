import { useRef, useState } from "react";
import { ArrowUpIcon, CalendarIcon, CameraIcon, PinIcon } from "./icons";

const DEFAULT_SUGGESTIONS = ["Black wallet", "House keys", "AirPods case", "Student ID card"];

const pillButton =
  "flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border-none bg-tint px-4 font-[inherit] text-sm leading-[inherit] font-semibold text-brand-600 max-[900px]:hidden";

/**
 * Props:
 *  - suggestions: quick-try chips
 *  - onSearch({ query, photo }): called on submit. If omitted, goes to /search?q=...
 *    (swap window.location.assign for your router's navigate)
 *  - onWhereClick / onWhenClick: handlers for the "Where?" and "When?" buttons
 */
export default function SearchPrompt({
  suggestions = DEFAULT_SUGGESTIONS,
  onSearch,
  onWhereClick,
  onWhenClick,
}) {
  const fileRef = useRef(null);
  const [query, setQuery] = useState("");
  const [photo, setPhoto] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q && !photo) return;
    if (onSearch) onSearch({ query: q, photo });
    else window.location.assign(`/search?q=${encodeURIComponent(q)}`);
  }

  function handlePhoto(e) {
    setPhoto(e.target.files?.[0] ?? null);
  }

  return (
    <div className="relative z-1 mx-auto flex w-full max-w-[900px] flex-col gap-3.5">
      <form
        className="flex h-[68px] items-center gap-2.5 rounded-full bg-white px-2.5 shadow-[0_20px_50px_rgb(4_20_80/0.35)] focus-within:shadow-[0_20px_50px_rgb(4_20_80/0.35),0_0_0_3px_rgb(255_255_255/0.5)] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-brand-600"
        onSubmit={handleSubmit}
        role="search"
      >
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
        <button
          type="button"
          className={`flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-none font-[inherit] ${
            photo ? "bg-brand-600 text-white" : "bg-tint text-brand-600"
          }`}
          aria-label={photo ? `Photo added: ${photo.name}. Change photo` : "Add a photo of your item"}
          onClick={() => fileRef.current?.click()}
        >
          <CameraIcon size={22} />
        </button>

        <label htmlFor="lost-item" className="sr-only">
          Describe your lost item
        </label>
        <input
          id="lost-item"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what you lost… e.g. black wallet, left on the bus yesterday evening"
          autoComplete="off"
          className="min-w-0 flex-1 border-none bg-transparent px-2 font-[inherit] text-[17px] leading-[inherit] text-ink outline-none placeholder:text-ink-muted placeholder:opacity-100"
        />

        <button type="button" className={pillButton} onClick={onWhereClick}>
          <PinIcon size={16} />
          Where?
        </button>
        <button type="button" className={pillButton} onClick={onWhenClick}>
          <CalendarIcon size={16} />
          When?
        </button>
        <button
          type="submit"
          className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-brand-600 font-[inherit] text-white"
          aria-label="Search for my item"
        >
          <ArrowUpIcon size={22} />
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <span className="text-[13px] leading-[inherit] font-semibold text-white/88">Try:</span>
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="rc-glass cursor-pointer rounded-full px-4 py-2 font-[inherit] text-[13px] leading-[inherit] font-semibold text-white hover:bg-glass-strong"
            onClick={() => setQuery(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
