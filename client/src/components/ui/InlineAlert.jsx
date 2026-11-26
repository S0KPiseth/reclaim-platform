const TONES = {
  error: "border-[#ffc2d0] bg-[#fff3f6] text-[#a5123a]",
  success: "border-[#b7efd2] bg-[#f1fdf7] text-[#0f7a4a]",
  info: "border-[#cddcff] bg-[#f4f8ff] text-[#1d4ed8]",
};

/** Small inline message inside a form or panel. */
export default function InlineAlert({ tone = "error", children, className = "" }) {
  if (!children) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-2xl border px-4 py-3 text-[13.5px] leading-relaxed font-semibold ${TONES[tone] ?? TONES.info} ${className}`}
    >
      {children}
    </div>
  );
}
