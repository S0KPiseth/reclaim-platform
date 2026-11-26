import { initials } from "../../lib/format";

const SIZES = {
  sm: "size-9 text-[12px]",
  md: "size-11 text-[14px]",
  lg: "size-16 text-[22px]",
};

export default function Avatar({ user, size = "md", className = "" }) {
  const name = user?.name?.trim();

  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-full bg-tint font-extrabold text-brand-700 ring-2 ring-white/70 ${SIZES[size]} ${className}`}
      aria-hidden="true"
    >
      {name ? initials(name) : "?"}
    </span>
  );
}
