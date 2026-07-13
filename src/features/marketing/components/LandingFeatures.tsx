import { useTranslation } from 'react-i18next'
import { Reveal } from '@/shared/ui/Reveal'
import { IconAi, IconRfq, IconShield } from './icons'

const FEATURES = [
  { Icon: IconRfq, titleKey: 'smartTitle', bodyKey: 'smartBody' },
  { Icon: IconAi, titleKey: 'evalTitle', bodyKey: 'evalBody' },
  { Icon: IconShield, titleKey: 'compliantTitle', bodyKey: 'compliantBody' },
]

export function LandingFeatures() {
  const { t } = useTranslation()

  return (
    <section className="bg-bg-canvas px-6 py-20 md:px-20">
      <div className="mx-auto max-w-6xl space-y-11">
        <Reveal className="mx-auto max-w-2xl space-y-3 text-center">
          <p className="text-xs font-medium tracking-wide text-brand-strong">
            {t('marketing.offer.eyebrow')}
          </p>
          <h2 className="text-3xl font-semibold text-content-primary">
            {t('marketing.offer.title')}
          </h2>
          <p className="text-lg text-content-secondary">{t('marketing.offer.subtitle')}</p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.titleKey} delay={index * 100}>
              <div className="group h-full space-y-3.5 rounded-2xl border border-border-subtle bg-bg-surface p-7 transition-transform duration-200 ease-out hover:-translate-y-1 motion-reduce:transition-none">
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-brand-subtle transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none">
                  <feature.Icon className="h-6 w-6 text-brand-strong" />
                </div>
                <h3 className="text-lg font-semibold text-content-primary">
                  {t(`marketing.offer.${feature.titleKey}`)}
                </h3>
                <p className="text-content-secondary">{t(`marketing.offer.${feature.bodyKey}`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
