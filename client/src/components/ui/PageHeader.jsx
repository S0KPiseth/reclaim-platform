export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-extrabold tracking-[0.2em] text-white/65 uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-[30px] leading-[1.12] font-extrabold tracking-[-0.025em] text-white max-[900px]:text-[25px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[72ch] text-[14.5px] leading-relaxed text-white/78">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
