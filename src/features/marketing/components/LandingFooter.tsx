import { useTranslation } from 'react-i18next'
import { useTenant } from '@/platform/tenancy'
import { LanguageToggle } from '@/platform/i18n'

const COLUMNS = [
  { titleKey: 'product', links: ['rfqsSourcing', 'bidComparison', 'suppliers', 'pricing'] },
  { titleKey: 'company', links: ['about', 'careers', 'contact', 'newsroom'] },
  { titleKey: 'legal', links: ['terms', 'privacy', 'sama', 'cookies'] },
]

export function LandingFooter() {
  const { t } = useTranslation()
  const { tenant } = useTenant()

  return (
    <footer className="border-t border-border-subtle bg-bg-surface px-6 pb-10 pt-14 md:px-20">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-12 md:flex-row">
          <div className="flex-1 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 shrink-0 rounded-lg bg-brand-primary" />
              <span className="text-base font-semibold tracking-tight text-content-primary">
                {tenant.name}
              </span>
            </div>
            <p className="max-w-xs text-sm text-content-secondary">
              {t('marketing.footer.description')}
            </p>
            <p className="text-xs text-content-tertiary">{t('marketing.footer.copyright')}</p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.titleKey} className="flex-1 space-y-3.5">
              <p className="text-xs font-medium tracking-wide text-content-tertiary">
                {t(`marketing.footer.${column.titleKey}`)}
              </p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-content-secondary hover:text-content-primary">
                      {t(`marketing.footer.${link}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border-subtle pt-6">
          <p className="text-sm text-content-tertiary">{t('marketing.footer.allRights')}</p>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <a href="#" className="text-sm text-content-tertiary hover:text-content-primary">
              {t('marketing.footer.status')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
