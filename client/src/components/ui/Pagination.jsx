import { ChevronLeftIcon, ChevronRightIcon } from "../reclaim/icons";

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pages">
      <button
        type="button"
        className="rc-btn rc-btn-ghost rc-btn-sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeftIcon size={15} />
        Previous
      </button>
      <span className="rounded-full border border-white/25 bg-glass px-4 py-1.5 text-[13px] font-semibold text-white/90">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="rc-btn rc-btn-ghost rc-btn-sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ChevronRightIcon size={15} />
      </button>
    </nav>
  );
}
