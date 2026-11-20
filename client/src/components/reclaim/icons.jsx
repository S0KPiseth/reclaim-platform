function Icon({ size = 20, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const BellIcon = (p) => (
  <Icon {...p}>
    <path d="M6 9a6 6 0 0112 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
    <path d="M10 20a2 2 0 004 0" />
  </Icon>
);

export const CameraIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="15" rx="3" />
    <circle cx="12" cy="12.5" r="3.5" />
    <path d="M8.5 5l1.2-2h4.6l1.2 2" />
  </Icon>
);

export const PinIcon = (p) => (
  <Icon {...p}>
    <path d="M12 21s7-6.2 7-11.5a7 7 0 00-14 0C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

export const CalendarIcon = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const ArrowUpIcon = (p) => (
  <Icon {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Icon>
);

export const ArrowRightIcon = (p) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const SparkleIcon = (p) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" />
  </Icon>
);

export const WalletIcon = (p) => (
  <Icon {...p} viewBox="0 0 120 120" strokeWidth={7}>
    <rect x="12" y="32" width="96" height="62" rx="12" />
    <rect x="68" y="53" width="40" height="22" rx="11" />
  </Icon>
);

export const DefaultAvatar = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <rect width="48" height="48" fill="#DCE8FF" />
    <circle cx="24" cy="19" r="8.5" fill="#1D4ED8" />
    <path d="M7 46c1-10 8.5-15 17-15s16 5 17 15z" fill="#1D4ED8" />
  </svg>
);
