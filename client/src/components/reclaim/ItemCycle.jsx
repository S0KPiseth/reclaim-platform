import { LOST_ITEMS } from "./items";

/** Shared animation config, injected once per <ItemCycle>. */
const CYCLE_KEYFRAMES = "rc-cycle";

/**
 * Props:
 *  - items: [{ id, label, src, width, height }] (defaults to LOST_ITEMS)
 *  - secondsPerItem: seconds each item stays on screen (default 3)
 */
export default function ItemCycle({ items = LOST_ITEMS, secondsPerItem = 3 }) {
  const total = items.length * secondsPerItem;
  const win = 100 / items.length; // % of the loop each item owns
  const fadeIn = (win * 0.18).toFixed(2);
  const holdEnd = (win * 0.84).toFixed(2);
  const out = (win * 1.02).toFixed(2);

  // keyframes depend on how many items there are, so they are generated here
  const keyframes = `@keyframes ${CYCLE_KEYFRAMES}{0%{opacity:0;transform:translateY(24px) scale(.88)}${fadeIn}%{opacity:1;transform:none}${holdEnd}%{opacity:1;transform:none}${out}%{opacity:0;transform:translateY(-24px) scale(.88)}100%{opacity:0}}`;

  return (
    <div className="relative aspect-square h-full max-h-[360px] rounded-full border border-white/30 bg-[radial-gradient(circle_at_50%_38%,rgb(255_255_255/0.3),rgb(255_255_255/0.06)_70%)]">
      <style>{keyframes}</style>
      <div
        className="absolute -inset-[34px] rounded-full border border-white/16"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 rounded-full border-[1.5px] border-white/55 animate-rc-pulse motion-reduce:animate-none"
        aria-hidden="true"
      />

      {items.map((item, i) => (
        <div
          key={item.id}
          className={`rc-slide absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-0 animate-rc-cycle motion-reduce:animate-none ${
            i === 0 ? "motion-reduce:opacity-100" : ""
          }`}
          style={{
            animationDelay: `${i * secondsPerItem}s`,
            animationDuration: `${total}s`,
          }}
        >
          <img
            src={item.src}
            alt=""
            width={item.width}
            height={item.height}
            className="max-h-[58%] w-auto max-w-[72%] drop-shadow-[0_18px_22px_rgb(4_20_80/0.4)]"
          />
          <span className="rounded-full border border-white/28 bg-glass-strong px-5 py-2 text-lg leading-[inherit] font-bold">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
