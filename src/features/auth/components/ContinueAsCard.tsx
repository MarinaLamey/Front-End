import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import type { Portal } from '@/platform/auth'
import { BuyerIcon, SupplierIcon } from './authIcons'
import { AuthFormFrame } from './AuthFormFrame'

type RoleOption = {
  id: Extract<Portal, 'buyer' | 'supplier'>
  Icon: typeof BuyerIcon
  circle: string
  code: string
  codeClass: string
  statKey: string
  statCount: number
}

// Mock account profiles. Real data comes from the BFF after identity auth.
const ROLES: RoleOption[] = [
  {
    id: 'buyer',
    Icon: BuyerIcon,
    circle: 'bg-brand-primary',
    code: 'MP-00482-B',
    codeClass: 'text-brand-strong',
    statKey: 'auth.openRfqsCount',
    statCount: 3,
  },
  {
    id: 'supplier',
    Icon: SupplierIcon,
    circle: 'bg-[#A855F7]',
    code: 'MP-00482-S',
    codeClass: 'text-[#9333EA]',
    statKey: 'auth.bidsPendingCount',
    statCount: 2,
  },
]

interface ContinueAsCardProps {
  onSelect: (role: Portal) => void
}

/** Choose which role to enter (only shown when the company has both). */
export function ContinueAsCard({ onSelect }: ContinueAsCardProps) {
  const { t } = useTranslation()
  const [remember, setRemember] = useState(false)

  return (
    <AuthFormFrame title={t('auth.continueAs')} subtitle={t('auth.continueAsSubtitle')}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelect(role.id)}
              className="flex flex-1 flex-col items-start gap-2.5 rounded-xl border border-border-subtle p-[18px] text-start transition-colors hover:border-brand-primary"
            >
              <span className={cn('rounded-full p-2.5', role.circle)}>
                <role.Icon className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-bold text-content-primary">{t(`portals.${role.id}`)}</span>
              <span className={cn('text-sm font-medium', role.codeClass)}>{role.code}</span>
              <span className="text-sm text-content-secondary">
                {t(role.statKey, { count: role.statCount })}
              </span>
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-content-secondary">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4 rounded border-border-default accent-brand-primary"
          />
          {t('auth.rememberChoice')}
        </label>
      </div>
    </AuthFormFrame>
  )
}
