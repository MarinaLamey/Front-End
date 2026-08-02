/* Line icons for the Create-RFQ flow — 1.5px stroke, currentColor, 16px grid, matching the
 * app's icon style. Kept local to the feature so steps import from one place. */

interface IconProps {
  className?: string
}

const base = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function PlusIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 4.167v11.666M4.167 10h11.666" />
    </svg>
  )
}

export function CloseIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 5 5 15M5 5l10 10" />
    </svg>
  )
}

export function TrashIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 5h15M6.667 5V3.333A1.667 1.667 0 0 1 8.333 1.667h3.334A1.667 1.667 0 0 1 13.333 3.333V5m2.5 0v11.667a1.667 1.667 0 0 1-1.666 1.666H5.833a1.667 1.667 0 0 1-1.666-1.666V5" />
    </svg>
  )
}

export function UploadIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M17.5 12.5v3.333a1.667 1.667 0 0 1-1.667 1.667H4.167A1.667 1.667 0 0 1 2.5 15.833V12.5M14.167 6.667 10 2.5 5.833 6.667M10 2.5v10" />
    </svg>
  )
}

export function CalendarIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15.833 3.333H4.167c-.92 0-1.667.747-1.667 1.667v11.667c0 .92.746 1.666 1.667 1.666h11.666c.92 0 1.667-.746 1.667-1.666V5c0-.92-.746-1.667-1.667-1.667ZM13.333 1.667V5M6.667 1.667V5M2.5 8.333h15" />
    </svg>
  )
}

export function LockIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15.833 9.167H4.167c-.92 0-1.667.746-1.667 1.666v5c0 .92.746 1.667 1.667 1.667h11.666c.92 0 1.667-.746 1.667-1.667v-5c0-.92-.746-1.666-1.667-1.666ZM5.833 9.167V5.833a4.167 4.167 0 0 1 8.334 0v3.334" />
    </svg>
  )
}

export function EyeOffIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8.82 4.235A6.8 6.8 0 0 1 10 4.133c4.167 0 6.667 4.167 6.667 4.167a12.3 12.3 0 0 1-1.442 2.13m-3.858.845a2 2 0 1 1-2.827-2.827M2.5 2.5l15 15M5.442 5.442A11.9 11.9 0 0 0 1.667 8.3s2.5 4.167 6.666 4.167a6.8 6.8 0 0 0 2.784-.592" />
    </svg>
  )
}

export function SparkleIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 2.5 11.667 7 16.667 8.333 11.667 9.667 10 14.167 8.333 9.667 3.333 8.333 8.333 7 10 2.5ZM4.167 13.333l.833 2.084L7.083 16.25l-2.083.833L4.167 19.167l-.833-2.084L1.25 16.25l2.084-.833.833-2.084Z" />
    </svg>
  )
}

export function InfoIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 18.333a8.333 8.333 0 1 0 0-16.666 8.333 8.333 0 0 0 0 16.666ZM10 13.333V10M10 6.667h.008" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth={2}>
      <path d="m16.667 5-8.334 8.333L4.167 9.167" />
    </svg>
  )
}

export function ArrowLeftIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15.833 10H4.167M10 15.833 4.167 10 10 4.167" />
    </svg>
  )
}

export function ArrowRightIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833" />
    </svg>
  )
}

export function ChevronDownIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  )
}

export function DownloadIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M17.5 12.5v3.333a1.667 1.667 0 0 1-1.667 1.667H4.167A1.667 1.667 0 0 1 2.5 15.833V12.5M5.833 8.333 10 12.5l4.167-4.167M10 12.5v-10" />
    </svg>
  )
}

export function AlertIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 6.667v3.333M10 13.333h.008M8.575 3.217 1.517 15a1.667 1.667 0 0 0 1.425 2.5h14.116a1.667 1.667 0 0 0 1.425-2.5L11.425 3.217a1.667 1.667 0 0 0-2.85 0Z" />
    </svg>
  )
}

/** Tabby brand tile — mint-green square with the black "t" mark (BNPL provider). */
export function TabbyMark({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="mp-tabby" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#63F2C4" />
          <stop offset="1" stopColor="#22C892" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#mp-tabby)" />
      <path
        d="M13 5.4v9.9a2.3 2.3 0 0 0 2.3 2.3h1"
        stroke="#0B0B0B"
        strokeWidth="3.3"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M9.2 9.1h6.1" stroke="#0B0B0B" strokeWidth="3" strokeLinecap="round" />
      <path d="M12.7 5.2 15.4 4" stroke="#0B0B0B" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

/** Tamara brand tile — pastel-gradient square with the two black "eye" marks (BNPL provider). */
export function TamaraMark({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="mp-tamara" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBC79F" />
          <stop offset="0.4" stopColor="#F5A6C8" />
          <stop offset="0.7" stopColor="#CBB6F0" />
          <stop offset="1" stopColor="#A6D9F2" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#mp-tamara)" />
      <path d="M7.6 8.2a3.4 3.4 0 0 1 3.4 3.4H7.6z" fill="#0B0B0B" />
      <circle cx="15.4" cy="12.4" r="3.4" fill="#0B0B0B" />
    </svg>
  )
}
