interface IconProps {
  className?: string
}

/** Google "G" mark in its brand colors. */
export function GoogleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.806.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  )
}

const strokeBase = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...strokeBase}>
      <path d="M.75 9S3.75 3.75 9 3.75 17.25 9 17.25 9 14.25 14.25 9 14.25.75 9 .75 9Z" />
      <circle cx="9" cy="9" r="2.25" />
    </svg>
  )
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...strokeBase}>
      <path d="M7.41 7.41a2.25 2.25 0 0 0 3.18 3.18" />
      <path d="M6.08 3.97A7.2 7.2 0 0 1 9 3.75c5.25 0 8.25 5.25 8.25 5.25a13.2 13.2 0 0 1-1.67 2.3M4.2 5.2A13.1 13.1 0 0 0 .75 9S3.75 14.25 9 14.25a7.1 7.1 0 0 0 2.9-.6" />
      <path d="M.75.75l16.5 16.5" />
    </svg>
  )
}

const stroke24 = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function BuyerIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke24}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  )
}

export function SupplierIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke24}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...strokeBase}>
      <path d="M14.25 15.75v-1.5a3 3 0 0 0-3-3h-4.5a3 3 0 0 0-3 3v1.5" />
      <circle cx="9" cy="5.25" r="3" />
    </svg>
  )
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...strokeBase}>
      <rect x="1.5" y="3" width="15" height="12" rx="2" />
      <path d="m1.5 5.25 7.5 4.5 7.5-4.5" />
    </svg>
  )
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...strokeBase}>
      <path d="M4.5 16.5V3a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 13.5 3v13.5" />
      <path d="M2.25 16.5h13.5M7.5 5.25h3M7.5 8.25h3M7.5 11.25h3" />
    </svg>
  )
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...strokeBase}>
      <rect x="3" y="8.25" width="12" height="7.5" rx="1.5" />
      <path d="M5.25 8.25V5.25a3.75 3.75 0 0 1 7.5 0v3" />
    </svg>
  )
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="M4 2.5v9l7-4.5z" />
    </svg>
  )
}

/** Apple wordmark logo (filled, uses currentColor). */
export function AppleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.04-.81.9-2.14 1.6-3.24 1.51-.14-1.1.4-2.27 1.13-3.04.82-.86 2.24-1.5 3.32-1.51zM20.5 17.2c-.55 1.27-.82 1.84-1.53 2.97-.99 1.57-2.39 3.53-4.12 3.54-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.78-4.04-3.35C-.06 16.92-.34 11.95 1.4 9.3c1.16-1.77 3-2.8 4.73-2.8 1.76 0 2.87 1 4.32 1 1.41 0 2.27-1 4.31-1 1.54 0 3.17.84 4.33 2.29-3.8 2.08-3.18 7.5-.59 8.41z" />
    </svg>
  )
}

/** Message bubble (stroked) — the SMS channel option. */
export function MessageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" {...strokeBase}>
      <path d="M15.75 11.25a1.5 1.5 0 0 1-1.5 1.5H5.25L2.25 15.75V3.75a1.5 1.5 0 0 1 1.5-1.5h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5Z" />
    </svg>
  )
}

/** Phone handset (stroked). */
export function PhoneIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...stroke24}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
