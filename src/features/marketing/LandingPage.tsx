import { SiteHeader } from '@/app/components/SiteHeader'
import { LandingHero } from './components/LandingHero'
import { LandingFeatures } from './components/LandingFeatures'
import { LandingAudience } from './components/LandingAudience'
import { LandingCta } from './components/LandingCta'
import { LandingFooter } from './components/LandingFooter'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-canvas">
      <SiteHeader />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingAudience />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
