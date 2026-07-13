import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { Reveal } from '@/shared/ui/Reveal'
import { IconBuyer, IconCheck, IconSupplier } from './icons'

type Tone = 'brand' | 'success'
type IconType = typeof IconBuyer

const BUYER_ITEMS = [1, 2, 3, 4].map((n) => ({
  titleKey: `buyer${n}Title`,
  bodyKey: `buyer${n}Body`,
}))
const SUPPLIER_ITEMS = [1, 2, 3, 4].map((n) => ({
  titleKey: `supplier${n}Title`,
  bodyKey: `supplier${n}Body`,
}))

interface AudienceCardProps {
  Icon: IconType
  title: string
  subtitle: string
  items: { titleKey: string; bodyKey: string }[]
  tone: Tone
}

function AudienceCard({ Icon, title, subtitle, items, tone }: AudienceCardProps) {
  const { t } = useTranslation()
  const accentBg = tone === 'brand' ? 'bg-brand-subtle' : 'bg-status-success-subtle'
  const accentText = tone === 'brand' ? 'text-brand-strong' : 'text-status-success'

  return (
    <div className="h-full space-y-6 rounded-[18px] border border-border-subtle bg-bg-canvas p-9">
      <div className="flex items-center gap-3.5">
        <div className={cn('flex h-[52px] w-[52px] items-center justify-center rounded-xl', accentBg)}>
          <Icon className={cn('h-6 w-6', accentText)} />
        </div>
        <div>
          <p className="text-xl font-semibold text-content-primary">{title}</p>
          <p className="text-sm text-content-secondary">{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.titleKey} className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                accentBg,
              )}
            >
              <IconCheck className={cn('h-3.5 w-3.5', accentText)} />
            </span>
            <div>
              <p className="text-sm font-medium text-content-primary">
                {t(`marketing.audience.${item.titleKey}`)}
              </p>
              <p className="text-sm text-content-secondary">
                {t(`marketing.audience.${item.bodyKey}`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LandingAudience() {
  const { t } = useTranslation()

  return (
    <section className="bg-bg-surface px-6 py-20 md:px-20">
      <div className="mx-auto max-w-6xl space-y-11">
        <Reveal className="mx-auto max-w-2xl space-y-3 text-center">
          <p className="text-xs font-medium tracking-wide text-brand-strong">
            {t('marketing.audience.eyebrow')}
          </p>
          <h2 className="text-3xl font-semibold text-content-primary">
            {t('marketing.audience.title')}
          </h2>
          <p className="text-lg text-content-secondary">{t('marketing.audience.subtitle')}</p>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal from="up">
            <AudienceCard
              Icon={IconBuyer}
              title={t('marketing.audience.buyersTitle')}
              subtitle={t('marketing.audience.buyersSubtitle')}
              items={BUYER_ITEMS}
              tone="brand"
            />
          </Reveal>
          <Reveal from="up" delay={120}>
            <AudienceCard
              Icon={IconSupplier}
              title={t('marketing.audience.suppliersTitle')}
              subtitle={t('marketing.audience.suppliersSubtitle')}
              items={SUPPLIER_ITEMS}
              tone="success"
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
