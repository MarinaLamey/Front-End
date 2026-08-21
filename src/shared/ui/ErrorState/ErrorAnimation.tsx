import { useEffect, useRef, useState } from 'react'
import { LottieLight, type LottieHandle } from 'lottie-react'
import { StaticGlyph } from './StaticGlyph'
import forbidden from './animations/forbidden.json'
import offline from './animations/offline.json'
import serverError from './animations/server-error.json'
import type { ErrorVariant } from './variants'

/*
 * The Lottie player, in its OWN module and loaded lazily by `ErrorState` — the engine is ~250 kB
 * and nothing about a healthy screen needs it. Default-exported because `React.lazy` requires it.
 *
 * `LottieLight` rather than `Lottie`: it carries the SVG renderer alone and drops the expression
 * engine, which these files do not use. That also drops lottie-web's `eval()` — the full build
 * compiles expressions at runtime, which the bundler flags and a strict CSP would refuse outright.
 *
 * The three animations are authored for this repo, not sourced — so there is no third-party licence
 * riding on them. Lottie bakes its colours into the JSON and cannot read a CSS variable, so each
 * one uses a MID-TONE of its token, picked to stay legible on both the light and the dark surface.
 * To swap in a designer's file, replace the JSON; nothing here changes.
 */

const DATA: Record<ErrorVariant, object> = {
  offline,
  forbidden,
  server: serverError,
}

/**
 * The frame each animation looks finished at, used as the still for reduced motion. Frame 0 is NOT
 * that frame — every variant starts mid-build (a ring not yet drawn, a lock not yet closed), so
 * simply not playing would leave an empty box.
 */
const RESTING_FRAME: Record<ErrorVariant, number> = {
  offline: 50,
  forbidden: 50,
  server: 45,
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ErrorAnimation({ variant }: { variant: ErrorVariant }) {
  const lottieRef = useRef<LottieHandle>(null)
  const [failed, setFailed] = useState(false)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    if (reduced) lottieRef.current?.seek(RESTING_FRAME[variant])
  }, [reduced, variant])

  // A failure is REPORTED, not thrown, so the boundary in ErrorState would never see it.
  if (failed) return <StaticGlyph />

  return (
    <LottieLight
      lottieRef={lottieRef}
      src={DATA[variant]}
      loop={!reduced}
      autoplay={!reduced}
      className="h-full w-full"
      subscriptions={{ error: () => setFailed(true) }}
      aria-hidden="true"
    />
  )
}
