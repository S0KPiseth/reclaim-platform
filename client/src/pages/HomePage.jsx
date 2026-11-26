import { FloatingCards, HeroHeading, ItemCycle, SearchPrompt } from "../components/reclaim";
import usePageTitle from "../lib/usePageTitle";

export default function HomePage() {
  usePageTitle("Lost something? Let’s find it");

  return (
    <div className="flex min-h-[calc(100dvh-120px)] flex-col pb-2">
      <section className="relative z-1 flex min-h-0 flex-1 flex-col items-center justify-center pt-2">
        <HeroHeading />
        <div className="relative mt-3 flex min-h-0 w-full flex-1 items-center justify-center">
          <ItemCycle />
          <FloatingCards />
        </div>
      </section>

      <SearchPrompt />
    </div>
  );
}
