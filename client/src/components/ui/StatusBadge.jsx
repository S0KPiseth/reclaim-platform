import { statusLabel } from "../../lib/format";

const TONES = {
  OPEN: "bg-[#e8f0ff] text-brand-700",
  CLAIMED: "bg-[#fff1d6] text-[#8a5a00]",
  RETURNED: "bg-[#e3f9ee] text-[#0f7a4a]",
  ARCHIVED: "bg-[#eef0f6] text-[#5a6a8f]",
  PENDING: "bg-[#fff1d6] text-[#8a5a00]",
  APPROVED: "bg-[#e3f9ee] text-[#0f7a4a]",
  REJECTED: "bg-[#ffe1e8] text-[#b3123a]",
  WITHDRAWN: "bg-[#eef0f6] text-[#5a6a8f]",
};

export default function StatusBadge({ status, className = "" }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-[0.08em] uppercase ${
        TONES[status] ?? TONES.ARCHIVED
      } ${className}`}
    >
      {statusLabel(status)}
    </span>
  );
}
