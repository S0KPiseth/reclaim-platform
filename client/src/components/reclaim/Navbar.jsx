import { BellIcon, DefaultAvatar } from "./icons";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Browse found items", href: "/browse" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Report a found item", href: "/report" },
];

const linkBase =
  "rounded-full px-5 py-2.5 text-sm leading-[inherit] font-semibold text-white no-underline";

const avatarMedia =
  "[&>svg]:block [&>svg]:size-full [&>svg]:rounded-full [&>img]:block [&>img]:size-full [&>img]:rounded-full [&>img]:object-cover";

/**
 * Props:
 *  - activeHref: href of the current page, used to highlight the active link
 *  - avatarSrc: URL of the signed-in user's avatar (falls back to a default avatar)
 *  - userName: used for the avatar button's accessible label
 */
export default function Navbar({ activeHref = "/", avatarSrc, userName }) {
  return (
    <header className="relative z-1 flex items-center justify-between pt-6">
      <a href="/" className="flex items-center gap-2.5" aria-label="Reclaim home">
        <img
          src="/images/reclaim-mark.svg"
          alt=""
          width={725}
          height={670}
          className="block h-9 w-auto"
        />
        <img
          src="/images/reclaim-wordmark-white.svg"
          alt="Reclaim"
          width={3665}
          height={1036}
          className="block h-[30px] w-auto"
        />
      </a>

      <nav
        className="flex gap-1 rounded-full border border-white/22 bg-glass-soft p-1.5 max-[900px]:hidden"
        aria-label="Main"
      >
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            aria-current={l.href === activeHref ? "page" : undefined}
            className={`${linkBase} hover:opacity-80 [&[aria-current=page]]:bg-white [&[aria-current=page]]:font-bold [&[aria-current=page]]:text-brand-600 [&[aria-current=page]]:opacity-100`}
          >
            {l.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-glass-soft text-white"
          aria-label="Notifications"
        >
          <BellIcon />
        </button>
        <button
          type="button"
          className={`relative size-12 cursor-pointer rounded-full border-[2.5px] border-white bg-[#dce8ff] p-0 ${avatarMedia}`}
          aria-label={userName ? `${userName}'s account` : "Your account"}
        >
          {avatarSrc ? <img src={avatarSrc} alt="" /> : <DefaultAvatar />}
          <span className="absolute right-[-1px] bottom-[-1px] size-[13px] rounded-full border-[2.5px] border-brand-700 bg-[#22c55e]" />
        </button>
      </div>
    </header>
  );
}
