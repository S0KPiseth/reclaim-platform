import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useLocation } from "../../lib/router";
import Avatar from "../ui/Avatar";
import { BellIcon, MenuIcon, XIcon } from "./icons";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Browse", href: "/browse" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Report a find", href: "/report" },
];

const linkBase =
  "rounded-full px-4 py-2 text-[13.5px] leading-[inherit] font-semibold no-underline transition-colors";

const isActive = (href, pathname) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export default function Navbar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 flex items-center justify-between gap-3 pt-6">
      <Link to="/" className="flex flex-none items-center gap-2.5" aria-label="Reclaim home">
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
          className="hidden h-[28px] w-auto sm:block"
        />
      </Link>

      <nav
        className="flex gap-1 rounded-full border border-white/20 bg-white/5 p-1.5 max-[900px]:hidden"
        aria-label="Main"
      >
        {LINKS.map((link) => {
          const active = isActive(link.href, pathname);
          return (
            <Link
              key={link.href}
              to={link.href}
              aria-current={active ? "page" : undefined}
              className={`${linkBase} ${
                active
                  ? "bg-white font-bold text-brand-700 shadow-[0_2px_10px_rgb(4_20_80/0.2)] hover:bg-white"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-none items-center gap-2">
        {user ? (
          <>
            <Link
              to="/my-claims"
              className="flex size-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Claims inbox"
              title="Claims inbox"
            >
              <BellIcon size={18} />
            </Link>
            <Link
              to="/profile"
              className="rounded-full ring-2 ring-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={`${user.name}'s account`}
              title={user.name}
            >
              <Avatar user={user} size="md" className="ring-0" />
            </Link>
          </>
        ) : (
          <>
            <Link to="/login" className="rc-btn rc-btn-ghost rc-btn-sm max-[560px]:hidden">
              Log in
            </Link>
            <Link to="/register" className="rc-btn rc-btn-light rc-btn-sm">
              Sign up
            </Link>
          </>
        )}

        <button
          type="button"
          className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-white/10 text-white min-[901px]:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="rc-mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
        </button>
      </div>

      {open && (
        <div
          id="rc-mobile-menu"
          className="absolute top-full right-0 left-0 z-30 mt-3 flex flex-col gap-1 rounded-3xl border border-white/25 bg-[#0a2a8f]/95 p-3 shadow-[0_24px_60px_rgb(4_20_80/0.5)] backdrop-blur-xl min-[901px]:hidden"
        >
          {LINKS.map((link) => {
            const active = isActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                to={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`rounded-2xl px-4 py-3 text-[14px] font-semibold ${
                  active ? "bg-white text-brand-700" : "text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="my-1 border-t border-white/15" />

          {user ? (
            <>
              <Link to="/my-items" className="rounded-2xl px-4 py-3 text-[14px] font-semibold text-white hover:bg-white/10">
                My posts
              </Link>
              <Link to="/my-claims" className="rounded-2xl px-4 py-3 text-[14px] font-semibold text-white hover:bg-white/10">
                My claims
              </Link>
              <Link to="/profile" className="rounded-2xl px-4 py-3 text-[14px] font-semibold text-white hover:bg-white/10">
                Profile
              </Link>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-1">
              <Link to="/login" className="rc-btn rc-btn-ghost rc-btn-sm">
                Log in
              </Link>
              <Link to="/register" className="rc-btn rc-btn-light rc-btn-sm">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
