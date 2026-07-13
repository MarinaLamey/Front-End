import { Fragment } from 'react'
import { Button } from '@/shared/ui/Button'
import type { ButtonSize, ButtonVariant } from '@/shared/ui/Button'
import type { UiError } from '@/shared/ui/types'

/**
 * Dev-only harness to stress-test the Button across every variant × size × state.
 * Route: /dev/buttons  (not part of the product; lives outside the app Layout).
 *
 * Typed against the exported option unions, so if a variant/size is added to the
 * config and not represented here, this file fails to compile — a coverage tripwire.
 */

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'link']
const SIZES: ButtonSize[] = ['sm', 'md', 'lg']

const sampleError: UiError = {
  title: 'Transfer failed',
  detail: 'Funds were not deducted.',
  actions: [{ label: 'Retry', onAction: () => console.log('retry') }],
}

type StateCol = { label: string; props: Record<string, unknown> }

const STATES: StateCol[] = [
  { label: 'Default', props: {} },
  { label: 'Disabled', props: { disabled: true } },
  { label: 'Loading', props: { isLoading: true } },
  { label: 'Pending', props: { isPending: true } },
  { label: 'Optimistic', props: { isOptimistic: true } },
  { label: 'Error', props: { error: sampleError, errorId: 'demo-err' } },
]

// auto-flow grid: [size label] + one column per state
const gridStyle = { gridTemplateColumns: `4rem repeat(${STATES.length}, minmax(7rem, 1fr))` }

function HeartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-10-9.3C.6 8.3 2.3 5 5.5 5c2 0 3.4 1.2 4.5 2.6C11.1 6.2 12.5 5 14.5 5 17.7 5 19.4 8.3 18 11.7 15.5 16.4 12 21 12 21z" />
    </svg>
  )
}

export function ButtonShowcase() {
  return (
    <div className="min-h-screen bg-white p-8 text-slate-900">
      <header className="mb-8 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">Button — design-system harness</h1>
        <p className="mt-2 text-sm text-slate-600">
          5 variants × 3 sizes × {STATES.length} states. Hover a button to see the GPU-only
          hover transition; press to see the <code>scale</code> on the compositor; loading swaps to
          a centered spinner with <strong>zero layout shift</strong> (the label keeps its
          footprint). Pending/optimistic show a pulsing dot. Enable “reduce motion” in your OS to
          confirm transitions are disabled.
        </p>
      </header>

      <div className="space-y-12">
        {VARIANTS.map((variant) => (
          <section key={variant}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {variant}
            </h2>

            <div className="grid items-center gap-x-6 gap-y-4" style={gridStyle}>
              {/* header row */}
              <div />
              {STATES.map((state) => (
                <div key={state.label} className="text-xs font-medium text-slate-400">
                  {state.label}
                </div>
              ))}

              {/* one row per size */}
              {SIZES.map((size) => (
                <Fragment key={size}>
                  <div className="text-xs font-mono text-slate-400">{size}</div>
                  {STATES.map((state) => (
                    <div key={state.label} className="flex justify-start">
                      <Button variant={variant} size={size} {...state.props}>
                        Button
                      </Button>
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </section>
        ))}

        {/* Icons + full-width sanity checks */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Icons & full width
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" leftIcon={<HeartIcon />}>
              With left icon
            </Button>
            <Button variant="secondary" rightIcon={<HeartIcon />}>
              With right icon
            </Button>
            <Button variant="ghost" leftIcon={<HeartIcon />} isLoading>
              Loading keeps width
            </Button>
          </div>
          <div className="mt-4 max-w-md">
            <Button variant="primary" size="lg" fullWidth>
              Full-width call to action
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
