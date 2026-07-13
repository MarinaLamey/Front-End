interface IconProps {
  className?: string
}

/* Icons for the register wizard + KYC screens, normalised to `currentColor` so they theme.
   20-viewBox stroke icons unless noted. */
const s20 = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.667,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const s24 = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Buyer — shopping cart (exact Figma icon). */
export function CartIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...s24}>
      <path d="M8 22C8.55228 22 9 21.5523 9 21C9 20.4477 8.55228 20 8 20C7.44772 20 7 20.4477 7 21C7 21.5523 7.44772 22 8 22Z" />
      <path d="M19 22C19.5523 22 20 21.5523 20 21C20 20.4477 19.5523 20 19 20C18.4477 20 18 20.4477 18 21C18 21.5523 18.4477 22 19 22Z" />
      <path d="M2 3H4L6.6 15.4C6.6935 15.8586 6.94485 16.2698 7.31028 16.5621C7.67572 16.8545 8.13211 17.0094 8.6 17H18.3C18.7679 17.0094 19.2243 16.8545 19.5897 16.5621C19.9552 16.2698 20.2065 15.8586 20.3 15.4L21 7H5" />
    </svg>
  )
}

/** Seller — storefront (exact Figma icon). */
export function StoreIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...s24}>
      <path d="M3 3H21L20 8H4L3 3Z" />
      <path d="M5 8V20H19V8" />
      <path d="M9 20V14H15V20" />
    </svg>
  )
}

/** Both — repeat / swap (exact Figma icon). */
export function RepeatIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...s24}>
      <path d="M17 2L21 6L17 10" />
      <path d="M3 11V9C3 7.93913 3.42143 6.92172 4.17157 6.17157C4.92172 5.42143 5.93913 5 7 5H21" />
      <path d="M7 22L3 18L7 14" />
      <path d="M21 13V15C21 16.0609 20.5786 17.0783 19.8284 17.8284C19.0783 18.5786 18.0609 19 17 19H3" />
    </svg>
  )
}

/** Upload cloud/arrow for the file dropzone. */
export function UploadIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <path d="M3.333 13.333v1.667a1.667 1.667 0 0 0 1.667 1.667h10a1.667 1.667 0 0 0 1.667-1.667v-1.667" />
      <path d="m6.667 7.5 3.333-3.333L13.333 7.5" />
      <path d="M10 4.167v9.166" />
    </svg>
  )
}

/** Chevron down (select). */
export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  )
}

/** Small close (chip remove). */
export function XIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4 4 12M4 4l8 8" />
    </svg>
  )
}

/** Clock (KYC pending). */
export function ClockIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.833V10l2.917 1.667" />
    </svg>
  )
}

/** Users (invite team). */
export function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <path d="M14.167 17.5v-1.667a3.333 3.333 0 0 0-3.334-3.333H5.833A3.333 3.333 0 0 0 2.5 15.833V17.5" />
      <circle cx="8.333" cy="5.833" r="2.917" />
      <path d="M17.5 17.5v-1.667a3.333 3.333 0 0 0-2.5-3.225M13.333 3.058a3.333 3.333 0 0 1 0 6.05" />
    </svg>
  )
}

/** Sliders (RFQ). */
export function SlidersIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <path d="M2.5 15h4.167M11.667 15H17.5M2.5 10h8.333M15 10h2.5M2.5 5h2.5M11.667 5H17.5" />
      <circle cx="8.333" cy="15" r="1.667" />
      <circle cx="12.5" cy="10" r="1.667" />
      <circle cx="6.667" cy="5" r="1.667" />
    </svg>
  )
}

/** Grid (dashboard). */
export function GridIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <rect x="2.5" y="2.5" width="6.25" height="6.25" rx="1" />
      <rect x="11.25" y="2.5" width="6.25" height="6.25" rx="1" />
      <rect x="2.5" y="11.25" width="6.25" height="6.25" rx="1" />
      <rect x="11.25" y="11.25" width="6.25" height="6.25" rx="1" />
    </svg>
  )
}

/** Lock (locked action). */
export function LockIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.333} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.333" y="7.333" width="9.333" height="6" rx="1.333" />
      <path d="M5.333 7.333V5.333a2.667 2.667 0 0 1 5.334 0v2" />
    </svg>
  )
}

/** Alert circle (rejected). */
export function AlertCircleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6.667V10M10 13.333h.008" />
    </svg>
  )
}

/** Info circle. */
export function InfoIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 13.333V10M10 6.667h.008" />
    </svg>
  )
}

/** Warning triangle. */
export function WarningIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <path d="M8.575 3.217 1.517 15a1.667 1.667 0 0 0 1.425 2.5h14.116a1.667 1.667 0 0 0 1.425-2.5L11.425 3.217a1.667 1.667 0 0 0-2.85 0z" />
      <path d="M10 7.5v3.333M10 14.167h.008" />
    </svg>
  )
}

/** Plain check (no circle) — for the success badge. */
export function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <path d="m5 10.5 3.333 3.333L15 6" />
    </svg>
  )
}

/** Circled check (approved note). */
export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" {...s20}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="m6.667 10 2.5 2.5 4.166-5" />
    </svg>
  )
}
