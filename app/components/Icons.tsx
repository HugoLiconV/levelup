import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "utensils"
  | "footprints"
  | "chart"
  | "more"
  | "check"
  | "plus"
  | "minus"
  | "arrow"
  | "sparkles"
  | "sun"
  | "clock"
  | "dumbbell"
  | "calendar"
  | "users"
  | "target"
  | "refresh"
  | "flag"
  | "flask"
  | "heart"
  | "leaf"
  | "settings"
  | "bell"
  | "download"
  | "upload"
  | "trash"
  | "close"
  | "chevron"
  | "edit"
  | "info"
  | "walk"
  | "gym"
  | "run"
  | "bike"
  | "other"
  | "coffee"
  | "meal"
  | "lock"
  | "checkCircle";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></>,
  utensils: <><path d="M7 3v8" /><path d="M4 3v5a3 3 0 0 0 6 0V3" /><path d="M7 11v10" /><path d="M17 3v18" /><path d="M17 3c2.2 1.3 3 3.6 3 6h-3" /></>,
  footprints: <><path d="M8.5 5.5c.5 2-1 4-2.8 4.3-1.7.3-2.8-1-2.7-2.5.1-1.7 1.5-3.6 3.2-3.8 1-.1 1.9.7 2.3 2Z" /><path d="M15.4 18.3c-.5-2 1-4 2.8-4.3 1.7-.3 2.8 1 2.7 2.5-.1 1.7-1.5 3.6-3.2 3.8-1 .1-1.9-.7-2.3-2Z" /><path d="M11.6 10.3c1.6 1.5 1.7 3.9.3 5.1-1.3 1.1-3.2.5-4.1-.8-.9-1.4-.4-3.6.8-4.7.9-.8 2.1-.6 3 .4Z" /></>,
  chart: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 3-4 3 2 5-6" /><path d="M18 7h2v2" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  sparkles: <><path d="m12 3-1.3 5.7L5 10l5.7 1.3L12 17l1.3-5.7L19 10l-5.7-1.3L12 3Z" /><path d="m19 15-.6 2.4L16 18l2.4.6L19 21l.6-2.4L22 18l-2.4-.6L19 15Z" /><path d="m5 3-.5 2L3 5.5 4.5 6 5 8l.5-2L7 5.5 5.5 5 5 3Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  dumbbell: <><path d="M6 5v14M18 5v14M3 8v8M21 8v8M6 12h12M3 10h3M18 10h3M3 14h3M18 14h3" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M16 2.5v4M8 2.5v4M3 9h18" /></>,
  users: <><path d="M16 21v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 19.5V21" /><circle cx="10" cy="7" r="3.5" /><path d="M17 11a3.5 3.5 0 0 0 0-7M20 21v-1.5a4.5 4.5 0 0 0-3.2-4.3" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.5-4.5L3 9" /><path d="M3 4v5h5" /><path d="M4 13a8 8 0 0 0 14.5 4.5L21 15" /><path d="M21 20v-5h-5" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 5c4-3 7 3 12 0v9c-5 3-8-3-12 0" /></>,
  flask: <><path d="M9 3h6M10 3v6l-5.4 9.2A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-2.8L14 9V3" /><path d="M7.5 16h9" /></>,
  heart: <path d="M20.8 8.8c0 5.5-8.8 10.3-8.8 10.3S3.2 14.3 3.2 8.8a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" />,
  leaf: <><path d="M20.5 3.5C11 3.5 4 7 4 14c0 2.2 1.8 4 4 4 7 0 10.5-7 12.5-14.5Z" /><path d="M4 21c2.5-5.5 6.5-8.5 12-11" /></>,
  settings: <g transform="translate(1.5 1.5) scale(.875)"><circle cx="12" cy="12" r="3.3" /><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a2 2 0 1 1-4 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a2 2 0 1 1 0-4h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 3-.9v-.2a2 2 0 1 1 4 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0 .9 3h.2a2 2 0 1 1 0 4h-.2a1.8 1.8 0 0 0-.9 3Z" /></g>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
  upload: <><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M4 21h16" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  edit: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m14.5 7.5 3 3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  walk: <><circle cx="13" cy="4.5" r="2" /><path d="m11.5 9-2 4 3 2 1 5M11.5 9l4 2 2 4M9.5 13 6 17M15 11l-1 5" /></>,
  gym: <><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></>,
  run: <><circle cx="14" cy="4" r="2" /><path d="m12 9 3 2 3-2M12 9l-2 5 4 2M13 16l-2 5M16 11l-1 5 4 3" /></>,
  bike: <><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="m6 17 4-8h4l4 8M10 9l-2-2M14 9l2-2M10 9l4 8" /></>,
  other: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></>,
  coffee: <><path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8ZM16 10h1a3 3 0 0 1 0 6h-2" /><path d="M8 4v2M12 4v2" /></>,
  meal: <><path d="M4 3v8M2 3v5a2 2 0 0 0 4 0V3M4 11v10M15 3v18M15 3c3 2 4 5 4 8h-4" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></>,
};

export function Icon({ name, size = 20, strokeWidth = 1.8, ...props }: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
