export default function HeroHeading() {
  return (
    <div className="text-center">
      <span className="inline-block rounded-full border border-white/25 bg-glass-soft px-4 py-1.5 text-[13px] leading-[inherit] font-semibold">
        Lost &amp; Found
      </span>
      <h1 className="my-2.5 text-[52px] leading-[1.06] font-extrabold tracking-[-1.5px] max-[900px]:text-[38px]">
        Lost something?
        <br />
        Let’s find it.
      </h1>
      <p className="text-base leading-normal text-white/90">
        Describe it, add a photo, and we’ll search everything that’s been handed in.
      </p>
    </div>
  );
}
