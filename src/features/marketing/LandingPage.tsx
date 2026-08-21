import { SiteHeader } from '@/app/components/SiteHeader'
import { LandingHero } from './components/LandingHero'
import { LandingFeatures } from './components/LandingFeatures'
import { LandingAudience } from './components/LandingAudience'
import { LandingCta } from './components/LandingCta'
import { LandingFooter } from './components/LandingFooter'
import { ThreadPath } from './motion/ThreadPath'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-canvas">
      <SiteHeader />
      <main>
        {/* Hero + Features share one `relative` region so the Thread (absolutely positioned, so
            it can never affect either section's own layout/CLS) can span both. It renders AFTER
            both sections in DOM order — on top, not behind: Hero's and Features' own opaque
            backgrounds would fully hide an overlay placed behind them across each section's
            entire area, so "behind the cards" isn't achievable without splitting the path into a
            per-section piece each section would need to host internally. Kept simple instead —
            a thin, translucent line that mostly threads the grid's own center gutter (its curve
            oscillates around the midline between the two card columns) reads as an accent, not
            an occlusion. */}
        <div className="relative">
          <LandingHero />
          <LandingFeatures />
          <ThreadPath />
        </div>
        <LandingAudience />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
