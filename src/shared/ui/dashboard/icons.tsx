/* ────────────────────────────────────────────────────────────────────────────
 * Dashboard icon set — the line icons used across the portal shell and the
 * dashboard kit (nav, stat tiles, list rows, quick actions). All 24×24, drawn
 * with `currentColor` so they inherit text colour and theme automatically.
 * ──────────────────────────────────────────────────────────────────────────── */

interface IconProps {
  className?: string
}

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

/* ── Sidebar nav ──────────────────────────────────────────────────────────── */

export function GridIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Svg>
  )
}

export function FileIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </Svg>
  )
}

export function ChecklistIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      <path d="m9 11 3 3 10-10" />
    </Svg>
  )
}

/** Balance scale — the "Bids" nav (comparing offers). */
export function ScaleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </Svg>
  )
}

export function ChatIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  )
}

/** Help / support — a question-mark circle (Quick Actions). */
export function HelpIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.4 2.4 0 0 1 4.66.8c0 1.6-2.4 2.4-2.4 2.4" />
      <path d="M12 16.6h.01" />
    </Svg>
  )
}

/** Shield — the "Organisation Admin" header badge. */
export function ShieldIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3l7 3v5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6z" />
    </Svg>
  )
}

/** Edit — a pencil (user administration row action). */
export function EditIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  )
}

/** Delete — a trash can (user administration row action). */
export function TrashIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  )
}

/** Coins — the org "Payment Received" tile. */
export function CoinsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <ellipse cx="9" cy="6" rx="6" ry="2.5" />
      <path d="M3 6v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6" />
      <path d="M3 11v5c0 1.4 2.7 2.5 6 2.5 1 0 2-.1 2.8-.3" />
      <ellipse cx="17" cy="15" rx="4.5" ry="2" />
      <path d="M12.5 15v3c0 1.1 2 2 4.5 2s4.5-.9 4.5-2v-3" />
    </Svg>
  )
}

export function BoxIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </Svg>
  )
}

export function UsersIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
    </Svg>
  )
}

/** Bank / landmark building — the Organisation nav group and the Organisation-profile item. */
export function BankIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4 20 9H4Z" />
      <path d="M6 9v12M10 9v12M14 9v12M18 9v12" />
      <path d="M4 21h16" />
    </Svg>
  )
}

/** Gear — the Organisation → Settings item. */
export function SettingsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  )
}

export function ShieldDocIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  )
}

/** Document with a checkmark — "Documents & Compliance" nav. */
export function DocCheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="m8.5 14 2 2 4-4" />
    </Svg>
  )
}

export function ChartIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 3v18h18" />
      <path d="m18.5 8-5 5-2.5-2.5-4 4" />
    </Svg>
  )
}

/* ── Topbar & misc ────────────────────────────────────────────────────────── */

export function BellIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  )
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

/** Chevron pointing to the inline end. Rotate 180° for the "previous" direction. */
export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  )
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 17 17 7M8 7h9v9" />
    </Svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function LockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  )
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </Svg>
  )
}

export function EyeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

/** Eye with a slash — "hidden / anonymous". Used by the Anonymous chip on RFQ rows. */
export function EyeOffIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.7 6.2A9.6 9.6 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.7" />
      <path d="M6.5 7.7A17 17 0 0 0 2 12s3.5 6 10 6a9.9 9.9 0 0 0 4.2-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </Svg>
  )
}

export function TruckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </Svg>
  )
}

export function BarsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 20V10M12 20V4M18 20v-6" />
    </Svg>
  )
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6.3 6.3 4 4M20 20l-2.3-2.3M6.3 17.7 4 20M20 4l-2.3 2.3" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  )
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </svg>
  )
}

export function ClockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Svg>
  )
}

/** Outlined star — "Add to favourites" on a closed order. */
export function StarIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m12 4 2.45 4.96 5.55.81-4 3.9.94 5.5L12 16.6l-4.94 2.6.94-5.5-4-3.9 5.55-.81z" />
    </Svg>
  )
}

export function CreditCardIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
    </Svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  )
}

export function PercentBadgeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14 16 10" />
      <path d="M9 9h.01M15 15h.01" />
    </Svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  )
}

export function XCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </Svg>
  )
}

export function AlertTriangleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </Svg>
  )
}

/** Tray with an up arrow — the glyph inside a file dropzone. */
export function UploadIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="m8 9 4-4 4 4" />
      <path d="M12 5v11" />
    </Svg>
  )
}

/** Three stacked bars — the mobile hamburger trigger for PortalShell's sidebar drawer. */
export function MenuIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  )
}
