import { ArrowRightIcon, SparkleIcon, WalletIcon } from "./icons";
import { Link } from "../../lib/router";

/** The frosted cards that float around the item cycle. Place inside the hero stage. */
export default function FloatingCards() {
  return (
    <>
      <div className="rc-glass absolute top-[10%] left-[6%] w-[250px] rounded-[20px] p-4 text-center max-[1100px]:hidden">
        <div className="mb-2.5 text-xs leading-[inherit] font-semibold text-white/85">Recently found</div>
        <div className="flex items-center gap-2.5">
          <div className="flex size-[38px] items-center justify-center rounded-xl bg-white/18">
            <WalletIcon size={20} />
          </div>
          <div>
            <div className="text-base leading-[inherit] font-bold">Black wallet</div>
            <div className="mt-0.5 text-[13px] leading-[1.45] text-white/88">
              Handed in at the front desk · 2h ago
            </div>
          </div>
        </div>
      </div>

      <div className="rc-glass absolute top-[34%] right-[6%] w-[250px] rounded-[20px] p-4 text-center max-[1100px]:hidden">
        <div className="mb-2 flex items-center gap-2">
          <SparkleIcon size={18} />
          <span className="text-base leading-[inherit] font-bold">Smart match</span>
        </div>
        <div className="text-[13px] leading-[1.45] text-white/88">
          Add a photo and we’ll compare it with every item that’s been found.
        </div>
      </div>

      <Link
        to="/report"
        className="rc-glass absolute bottom-[6%] left-[6%] flex items-center gap-2.5 rounded-full px-[18px] py-3 text-sm leading-[inherit] font-semibold text-white no-underline hover:opacity-85 max-[1100px]:hidden"
      >
        Found something? Report it
        <ArrowRightIcon size={16} />
      </Link>
    </>
  );
}
