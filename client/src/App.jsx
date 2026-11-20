import { useEffect } from "react";
import {
  FloatingCards,
  HeroHeading,
  ItemCycle,
  Navbar,
  SearchPrompt,
} from "./components/reclaim";

export default function App() {
  useEffect(() => {
    document.title = "Reclaim — Lost & Found";
  }, []);

  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-[linear-gradient(160deg,#2f6bff_0%,#1646d6_45%,#0a2a8f_100%)] px-10 pb-[30px] font-sans text-white box-border max-[900px]:px-5 max-[900px]:pb-5">
      <img
        src="/images/reclaim-wordmark-white.svg"
        alt=""
        aria-hidden="true"
        width={3665}
        height={1036}
        className="pointer-events-none absolute top-[-44px] left-1/2 h-auto w-[1180px] max-w-[90%] -translate-x-1/2 opacity-[0.09] select-none"
      />

      {/* Pass the signed-in user's avatar, e.g. avatarSrc={user.avatarUrl} */}
      <Navbar activeHref="/" />

      <section className="relative z-1 flex min-h-0 flex-1 flex-col items-center justify-center pt-2">
        <HeroHeading />
        <div className="relative mt-3 flex min-h-0 w-full flex-1 items-center justify-center">
          <ItemCycle />
          <FloatingCards />
        </div>
      </section>

      <SearchPrompt />
    </main>
  );
}
