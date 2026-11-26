import { imageUrl } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { Link } from "../../lib/router";
import { PinIcon, SparkleIcon } from "../reclaim/icons";
import StatusBadge from "./StatusBadge";

export function PhotoPlaceholder({ label = "No photo yet", className = "" }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[repeating-linear-gradient(45deg,#eef3ff,#eef3ff_12px,#f8faff_12px,#f8faff_24px)] text-center text-[12px] font-semibold text-ink-muted ${className}`}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="M4.5 17l4.7-4.5 3.3 3 2.6-2.4 4.4 4.2" />
      </svg>
      {label}
    </div>
  );
}

export default function ItemCard({ item }) {
  if (!item) return null;

  const photo = item.images?.[0] ? imageUrl(item.images[0].url) : "";
  const score = typeof item.score === "number" ? Math.round(item.score * 100) : null;

  return (
    <Link
      to={`/items/${item.id}`}
      className="rc-card group focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-soft">
        {photo ? (
          <img
            src={photo}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <PhotoPlaceholder />
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <StatusBadge status={item.status} className="shadow-sm" />
        </div>
        {score !== null && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-brand-700 shadow-sm uppercase">
            <SparkleIcon size={11} />
            {score}% match
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <span className="text-[10.5px] font-extrabold tracking-[0.12em] text-brand-600 uppercase">
          {item.category?.name ?? "Uncategorised"}
        </span>
        <h3 className="mt-1 line-clamp-2 text-[17px] leading-snug font-bold text-ink">
          {item.title}
        </h3>
        <p className="mt-auto flex items-center gap-1.5 pt-2.5 text-[13px] text-ink-muted">
          <PinIcon size={14} />
          <span className="truncate">{item.foundLocation}</span>
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">{formatDate(item.foundAt)}</p>
      </div>
    </Link>
  );
}
