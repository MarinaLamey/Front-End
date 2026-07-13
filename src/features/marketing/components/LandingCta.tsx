import { useTranslation } from 'react-i18next'
import { Reveal } from '@/shared/ui/Reveal'
import { ShimmerButton } from '@/shared/ui/ShimmerButton'
import { MorphButton } from '@/shared/ui/MorphButton'
import { ctaSecondaryDark } from './ctaStyles'

export function LandingCta() {
  const { t } = useTranslation()

  return (
    <section className="bg-[linear-gradient(101deg,#0E938D_0%,#325AE1_100%)] px-6 py-[72px] md:px-20">
      <Reveal from="up" className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <h2 className="text-3xl font-semibold text-white">{t('marketing.finalCta.title')}</h2>
        <p className="max-w-xl text-lg text-white/90">{t('marketing.finalCta.subtitle')}</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <MorphButton
            to="/register"
            tone="onDark"
            label={t('marketing.finalCta.primary')}
            hoverLabel={t('marketing.hero.growWithUs')}
          />
          <ShimmerButton trigger="click" className={ctaSecondaryDark}>
            {t('marketing.finalCta.secondary')}
          </ShimmerButton>
        </div>
      </Reveal>
    </section>
  )
}
