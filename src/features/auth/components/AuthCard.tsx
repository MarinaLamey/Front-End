import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/** Card chrome shared by the login and register screens. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-bg-surface p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-content-primary">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-content-tertiary">{subtitle}</p>}
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-6 text-center text-sm text-content-tertiary">{footer}</div>}
    </div>
  )
}
