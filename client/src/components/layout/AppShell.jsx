import { useLocation } from "../../lib/router";
import { Navbar } from "../reclaim";
import Footer from "./Footer";

/**
 * Blue glass canvas shared by every screen. The landing page keeps its
 * full-viewport composition, so the footer is only rendered on inner pages.
 */
export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[linear-gradient(160deg,#2f6bff_0%,#1646d6_45%,#0a2a8f_100%)] font-sans text-white">
      <img
        src="/images/reclaim-wordmark-white.svg"
        alt=""
        aria-hidden="true"
        width={3665}
        height={1036}
        className="pointer-events-none absolute top-[-44px] left-1/2 h-auto w-[1180px] max-w-[90%] -translate-x-1/2 opacity-[0.09] select-none"
      />
      <div className="relative z-1 mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-6 pb-6 max-[900px]:px-4">
        <Navbar />
        <main className="flex flex-1 flex-col pt-3">{children}</main>
        {!isHome && <Footer />}
      </div>
    </div>
  );
}
