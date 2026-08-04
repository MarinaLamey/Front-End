import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { useReveal } from '@/shared/motion'

/**
 * Dev-only harness for the Phase 1 motion foundation — tokens + the ten primitives.
 * Route: /dev/motion  (not part of the product; full-canvas, outside the app Layout).
 *
 * Nothing here is wired into app screens yet; this is the review surface for the
 * foundation. Every demo composes only `mp-*` primitive classes + the useReveal hook.
 */

const DURATIONS = [
  ['--dur-instant', '80ms', 'press / tap feedback'],
  ['--dur-fast', '120ms', 'hover, focus ring, tooltip'],
  ['--dur-quick', '160ms', 'dropdown, popover, button state'],
  ['--dur-base', '220ms', 'modal, card, most entrances'],
  ['--dur-slow', '320ms', 'drawer, page transition'],
  ['--dur-celebrate', '460ms', 'success / award only'],
]

const EASINGS = [
  ['--ease-standard', 'cubic-bezier(0.16, 1, 0.3, 1)', 'entrances, reveals (signature)'],
  ['--ease-spring', 'cubic-bezier(0.34, 1.56, 0.64, 1)', 'success / pop only'],
  ['--ease-move', 'cubic-bezier(0.65, 0, 0.35, 1)', 'element travelling A→B'],
  ['--ease-exit', 'cubic-bezier(0.4, 0, 1, 1)', 'dismissals'],
]

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-content-primary">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-content-secondary">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Demo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-surface p-5">
      <span className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">{label}</span>
      <div className="flex min-h-24 items-center justify-center rounded-lg bg-bg-surface-sunken p-4">
        {children}
      </div>
    </div>
  )
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm">{children}</div>
)

function RevealDemo() {
  const a = useReveal<HTMLDivElement>()
  const b = useReveal<HTMLDivElement>()
  const c = useReveal<HTMLDivElement>()
  return (
    <div className="h-48 space-y-3 overflow-y-auto rounded-lg bg-bg-surface-sunken p-4">
      <p className="text-xs text-content-tertiary">Scroll ↓ — each block reveals as it enters.</p>
      <div className="h-40 rounded-md border border-dashed border-border-subtle" />
      <div ref={a.ref} className="mp-reveal" data-shown={a.shown}>
        <Chip>Reveal one</Chip>
      </div>
      <div className="h-24 rounded-md border border-dashed border-border-subtle" />
      <div ref={b.ref} className="mp-reveal" data-shown={b.shown}>
        <Chip>Reveal two</Chip>
      </div>
      <div className="h-24 rounded-md border border-dashed border-border-subtle" />
      <div ref={c.ref} className="mp-reveal" data-shown={c.shown}>
        <Chip>Reveal three</Chip>
      </div>
    </div>
  )
}

export function MotionShowcase() {
  const [replay, setReplay] = useState(0)
  const [overlay, setOverlay] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="min-h-screen bg-bg-canvas px-6 py-10 text-content-primary">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Motion system · Phase 1</h1>
            <p className="mt-1 text-sm text-content-secondary">
              Foundation tokens + the ten primitives. Not yet wired into app screens.
            </p>
          </div>
          <Button onClick={() => setReplay((n) => n + 1)}>Replay entrances</Button>
        </header>

        {/* TOKENS */}
        <Section title="Tokens" subtitle="Everything composes from these — never a magic number.">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
              <h3 className="text-sm font-semibold">Durations</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {DURATIONS.map(([name, val, use]) => (
                  <div key={name} className="flex items-baseline justify-between gap-3">
                    <dt className="font-mono text-xs text-content-secondary">{name}</dt>
                    <dd className="text-content-tertiary">
                      <span className="font-semibold text-content-primary">{val}</span> · {use}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
              <h3 className="text-sm font-semibold">Easings</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {EASINGS.map(([name, val, use]) => (
                  <div key={name} className="flex flex-col">
                    <dt className="font-mono text-xs font-semibold text-content-primary">{name}</dt>
                    <dd className="font-mono text-[11px] text-content-tertiary">{val} · {use}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Section>

        {/* ENTRANCE PRIMITIVES (replayable) */}
        <Section title="Entrance primitives" subtitle="Fade · Scale · Slide · Stagger — press Replay entrances to play again.">
          <div key={replay} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Demo label="Fade">
              <div className="mp-fade">
                <Chip>Fade in</Chip>
              </div>
            </Demo>
            <Demo label="Scale">
              <div className="mp-scale">
                <Chip>Scale in</Chip>
              </div>
            </Demo>
            <Demo label="Slide · up">
              <div className="mp-slide">
                <Chip>Slide up</Chip>
              </div>
            </Demo>
            <Demo label="Slide · down">
              <div className="mp-slide" data-from="down">
                <Chip>Slide down</Chip>
              </div>
            </Demo>
            <Demo label="Slide · start (RTL-aware)">
              <div className="mp-slide" data-from="start">
                <Chip>Slide start</Chip>
              </div>
            </Demo>
            <Demo label="Stagger">
              <ul className="mp-stagger flex flex-col gap-2">
                {['One', 'Two', 'Three', 'Four'].map((r) => (
                  <li key={r} className="rounded-md bg-bg-surface px-3 py-1.5 text-sm font-medium">
                    {r}
                  </li>
                ))}
              </ul>
            </Demo>
          </div>
        </Section>

        {/* INTERACTION PRIMITIVES */}
        <Section title="Interaction primitives" subtitle="Lift · Press — hover / click the demos.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Demo label="Lift (hover)">
              <div className="mp-lift cursor-pointer rounded-xl border border-border-subtle bg-bg-surface px-6 py-5 text-sm font-semibold">
                Hover me
              </div>
            </Demo>
            <Demo label="Press (active)">
              <button className="mp-press rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white">
                Press me
              </button>
            </Demo>
            <Demo label="Reveal (scroll)">
              <RevealDemo />
            </Demo>
          </div>
        </Section>

        {/* TOGGLED PRIMITIVES */}
        <Section title="Overlay · Expand · Collapse" subtitle="Overlay fade, clip-path reveal (GPU-only), grid-rows accordion (cheap layout).">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Demo label="Overlay">
              <div className="flex flex-col items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setOverlay((v) => !v)}>
                  Toggle overlay
                </Button>
                {overlay && (
                  <div className="mp-overlay rounded-lg bg-black/60 px-4 py-2 text-sm font-medium text-white">
                    Scrim
                  </div>
                )}
              </div>
            </Demo>
            <Demo label="Expand (clip-path)">
              <div className="flex flex-col items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
                  Toggle expand
                </Button>
                <div className="mp-expand" data-open={expanded}>
                  <div className="rounded-md bg-bg-surface px-4 py-3 text-sm">Fixed-height content revealed by clip-path.</div>
                </div>
              </div>
            </Demo>
            <Demo label="Collapse (grid-rows)">
              <div className="flex flex-col items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setCollapsed((v) => !v)}>
                  Toggle collapse
                </Button>
                <div className="mp-collapsible" data-open={collapsed}>
                  <div>
                    <div className="rounded-md bg-bg-surface px-4 py-3 text-sm">
                      Accordion body — the row frees its space when closed.
                    </div>
                  </div>
                </div>
              </div>
            </Demo>
          </div>
        </Section>
      </div>
    </div>
  )
}
