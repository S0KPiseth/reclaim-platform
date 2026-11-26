/** Centered empty/error state on a white panel. Used on the blue canvas. */
export default function EmptyState({ icon, title, description, children, tone = "default" }) {
  return (
    <div
      className={`rc-panel mx-auto flex w-full max-w-[600px] flex-col items-center px-6 py-10 text-center sm:px-10 ${
        tone === "error" ? "ring-2 ring-[#ffc2d0]" : ""
      }`}
    >
      {icon && (
        <span
          className={`mb-4 flex size-14 items-center justify-center rounded-2xl ${
            tone === "error" ? "bg-danger-soft text-danger" : "bg-tint text-brand-600"
          }`}
        >
          {icon}
        </span>
      )}
      <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink">{title}</h2>
      {description && (
        <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-ink-muted">{description}</p>
      )}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
