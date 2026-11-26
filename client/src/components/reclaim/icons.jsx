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

export const ArrowLeftIcon = (p) => (
  <Icon {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
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

export const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Icon>
);

export const XIcon = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const MenuIcon = (p) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const CheckIcon = (p) => (
  <Icon {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Icon>
);

export const PlusIcon = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const TrashIcon = (p) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </Icon>
);

export const EditIcon = (p) => (
  <Icon {...p}>
    <path d="M4 20h4l10.5-10.5a2.5 2.5 0 00-3.5-3.5L4.5 16.5 4 20z" />
  </Icon>
);

export const LogOutIcon = (p) => (
  <Icon {...p}>
    <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />
  </Icon>
);

export const ChevronLeftIcon = (p) => (
  <Icon {...p}>
    <path d="M14 6l-6 6 6 6" />
  </Icon>
);

export const ChevronRightIcon = (p) => (
  <Icon {...p}>
    <path d="M10 6l6 6-6 6" />
  </Icon>
);

export const ImageIcon = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M4.5 17l4.7-4.5 3.3 3 2.6-2.4 4.4 4.2" />
  </Icon>
);

export const AlertIcon = (p) => (
  <Icon {...p}>
    <path d="M12 4l9 16H3L12 4z" />
    <path d="M12 10v4M12 17.5v.1" />
  </Icon>
);

export const UserIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4.5 20c.8-4.2 3.7-6.2 7.5-6.2s6.7 2 7.5 6.2" />
  </Icon>
);

export const MailIcon = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
    <path d="M4.5 7.5l7.5 6 7.5-6" />
  </Icon>
);

export const PhoneIcon = (p) => (
  <Icon {...p}>
    <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2.2 2A17.5 17.5 0 014.5 5.7a2 2 0 012-2.2z" />
  </Icon>
);

export const ShieldIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3l7 2.5v6c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5v-6L12 3z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);

export const ClockIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const TagIcon = (p) => (
  <Icon {...p}>
    <path d="M4 11.5V5a1 1 0 011-1h6.5L20 12.5 12.5 20 4 11.5z" />
    <circle cx="9" cy="9" r="1.4" />
  </Icon>
);

export const FilterIcon = (p) => (
  <Icon {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icon>
);

export const GridIcon = (p) => (
  <Icon {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </Icon>
);

export const InboxIcon = (p) => (
  <Icon {...p}>
    <path d="M4 13l2.5-8h11L20 13v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5z" />
    <path d="M4 13h4l1.5 2.5h5L16 13h4" />
  </Icon>
);

export const UploadIcon = (p) => (
  <Icon {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
  </Icon>
);

export const DefaultAvatar = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <rect width="48" height="48" fill="#DCE8FF" />
    <circle cx="24" cy="19" r="8.5" fill="#1D4ED8" />
    <path d="M7 46c1-10 8.5-15 17-15s16 5 17 15z" fill="#1D4ED8" />
  </svg>
);
