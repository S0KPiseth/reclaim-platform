import { Link } from "../../lib/router";

export default function Footer() {
  return (
    <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-[12.5px] text-white/60">
      <span>Reclaim — lost &amp; found for campus.</span>
      <nav className="flex flex-wrap gap-5" aria-label="Footer">
        <Link to="/browse" className="hover:text-white">
          Browse found items
        </Link>
        <Link to="/how-it-works" className="hover:text-white">
          How it works
        </Link>
        <Link to="/report" className="hover:text-white">
          Report a find
        </Link>
      </nav>
    </footer>
  );
}
