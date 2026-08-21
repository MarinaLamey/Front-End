import { useTranslation } from 'react-i18next'
import { useTenant } from '@/platform/tenancy'
import { Reveal } from '@/shared/ui/Reveal'
import { BrandLogo } from '@/shared/ui/BrandLogo'

const COLUMNS = [
  { titleKey: 'product', links: ['rfqsSourcing', 'bidComparison', 'suppliers', 'pricing'] },
  { titleKey: 'company', links: ['about', 'careers', 'contact', 'newsroom'] },
  { titleKey: 'legal', links: ['terms', 'privacy', 'sama', 'cookies'] },
]

/**
 * A footer link with a brand rule that sweeps in from the inline start on hover. scaleX only —
 * no width animation — so it stays on the compositor; the origin flips in RTL so the sweep
 * always runs from the side the text starts on.
 */
function FooterLink({ label }: { label: string }) {
  return (
    <a
      href="#"
      className="group/link relative inline-block text-sm text-content-secondary transition-colors duration-200 hover:text-content-primary"
    >
      {label}
      <span
        aria-hidden="true"
        className="absolute -bottom-0.5 start-0 h-px w-full origin-left scale-x-0 bg-brand-primary transition-transform duration-300 ease-out group-hover/link:scale-x-100 rtl:origin-right motion-reduce:transition-none"
      />
    </a>
  )
}

export function LandingFooter() {
  const { t } = useTranslation()
  const { tenant } = useTenant()

  return (
    <footer className="border-t border-border-subtle bg-bg-surface px-6 pb-10 pt-14 md:px-20">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-12 md:flex-row">
          {/* The brand block leads; the three link columns follow it in, one stagger step apart. */}
          <Reveal className="flex-1 space-y-3.5">
            {/* The lockup lifts as one on hover — transform only, and small enough to read as a
                response rather than a bounce. `animate-float` is deliberately not used here: its
                24px travel is scaled for the hero's decorative blobs, not a 40px mark. */}
            <div className="group/brand flex w-fit items-center gap-2">
              <BrandLogo
                alt=""
                className="h-10 w-auto shrink-0 transition-transform duration-500 ease-out group-hover/brand:-translate-y-0.5 group-hover/brand:scale-105 motion-reduce:transition-none"
              />
              <span className="text-base font-semibold tracking-tight text-content-primary transition-transform duration-500 ease-out group-hover/brand:-translate-y-0.5 motion-reduce:transition-none">
                {tenant.name}
              </span>
            </div>
            <p className="max-w-xs text-sm text-content-secondary">
              {t('marketing.footer.description')}
            </p>
            <p className="text-xs text-content-tertiary">{t('marketing.footer.copyright')}</p>
          </Reveal>

          {COLUMNS.map((column, i) => (
            <Reveal key={column.titleKey} delay={90 * (i + 1)} className="flex-1 space-y-3.5">
              <p className="text-xs font-medium tracking-wide text-content-tertiary">
                {t(`marketing.footer.${column.titleKey}`)}
              </p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <FooterLink label={t(`marketing.footer.${link}`)} />
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal delay={360} className="flex items-center justify-between border-t border-border-subtle pt-6">
          <p className="text-sm text-content-tertiary">{t('marketing.footer.allRights')}</p>
          <FooterLink label={t('marketing.footer.status')} />
        </Reveal>
      </div>
    </footer>
  )
}
