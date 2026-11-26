import { Link } from "../lib/router";
import usePageTitle from "../lib/usePageTitle";
import PageHeader from "../components/ui/PageHeader";
import {
  CameraIcon,
  CheckIcon,
  InboxIcon,
  SearchIcon,
  ShieldIcon,
  SparkleIcon,
  ArrowRightIcon,
} from "../components/reclaim/icons";

const STEPS = [
  {
    title: "Search the board",
    description:
      "Type what you lost — or add a photo. Smart search matches similar words, and photo search compares your picture with every item that has one.",
    icon: SearchIcon,
  },
  {
    title: "Send a claim",
    description:
      "Found your item? Open it and describe something only the owner would know: a mark, what’s inside, a receipt.",
    icon: ShieldIcon,
  },
  {
    title: "Poster approves",
    description:
      "The person who found it reviews the claim. Approving marks the item claimed and automatically rejects the other pending claims.",
    icon: CheckIcon,
  },
  {
    title: "Collect and return",
    description:
      "The poster’s contact details appear on your approved claim. Arrange the handover, then they mark the item returned.",
    icon: InboxIcon,
  },
];

export default function HowItWorksPage() {
  usePageTitle("How it works");

  return (
    <div>
      <PageHeader
        eyebrow="How it works"
        title="Lost it? Here’s the whole loop."
        description="Reclaim keeps every find in one place and makes the handover accountable — search, claim with proof, approve, collect."
        actions={
          <>
            <Link to="/browse" className="rc-btn rc-btn-light rc-btn-sm">
              Browse finds
            </Link>
            <Link to="/report" className="rc-btn rc-btn-ghost rc-btn-sm">
              Report a find
            </Link>
          </>
        }
      />

      <section className="rc-panel p-5 sm:p-7">
        <ol className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <li
                key={step.title}
                className="relative rounded-2xl border border-line bg-surface-soft/50 p-5"
              >
                <span className="absolute top-4 right-4 text-[42px] leading-none font-extrabold text-brand-600/10 select-none">
                  {index + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
                  <StepIcon size={21} />
                </span>
                <h2 className="mt-3 text-[17px] font-extrabold text-ink">{step.title}</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-2xl border border-[#cddcff] bg-[#f4f8ff] p-5">
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-ink">
            <SparkleIcon size={17} className="text-brand-600" />
            Two ways to search
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4">
              <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                <SearchIcon size={15} className="text-brand-600" />
                Smart text search
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                “purse” can find “black leather wallet”. If the AI service is offline the app falls
                back to keyword matching and tells you quietly.
              </p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                <CameraIcon size={15} className="text-brand-600" />
                Search by photo
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                Upload a picture and we compare it with every item photo. Matches are ordered best
                first. Photo search needs the AI service.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-[13px] text-ink-muted">
            Found something? Post it in under a minute — a photo is optional but helps.
          </p>
          <Link to="/report" className="rc-btn">
            Report a find
            <ArrowRightIcon size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
