import { Fragment } from 'react'
import { Input } from '@/shared/ui/Input'
import type { InputSize } from '@/shared/ui/Input'
import type { UiError } from '@/shared/ui/types'

/**
 * Dev-only harness for the Input across every size × state.
 * Route: /dev/inputs  (outside the app Layout).
 */

const SIZES: InputSize[] = ['sm', 'md', 'lg']

const sampleError: UiError = {
  title: 'Invalid IBAN',
  detail: 'Check the account number and try again.',
}

type StateCol = { label: string; props: Record<string, unknown> }

const STATES: StateCol[] = [
  { label: 'Default', props: { placeholder: 'Placeholder' } },
  { label: 'Filled', props: { defaultValue: 'Acme Industries Co.' } },
  { label: 'Error', props: { placeholder: 'Placeholder', error: sampleError, errorId: 'demo-in-err' } },
  { label: 'Disabled', props: { placeholder: 'Placeholder', disabled: true } },
  { label: 'Loading', props: { placeholder: 'Validating…', isLoading: true } },
]

const gridStyle = { gridTemplateColumns: `4rem repeat(${STATES.length}, minmax(11rem, 1fr))` }

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  )
}

export function InputShowcase() {
  return (
    <div className="min-h-screen bg-white p-8 text-slate-900">
      <header className="mb-8 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">Input — design-system harness</h1>
        <p className="mt-2 text-sm text-slate-600">
          3 sizes × {STATES.length} states. <strong>Click any field</strong> to see the teal focus
          outline — it grows 1px→2px via <code>outline</code>, so there's <strong>zero layout
          shift</strong> (the box never nudges its neighbours). Error fields show the danger outline
          and set <code>aria-invalid</code>; disabled fields go sunken at .60 opacity; loading shows
          a trailing spinner without blocking typing.
        </p>
      </header>

      <section className="mb-12">
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
              <div className="font-mono text-xs text-slate-400">{size}</div>
              {STATES.map((state) => (
                <div key={state.label}>
                  <Input size={size} {...state.props} />
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Adornments
        </h2>
        <div className="flex max-w-md flex-col gap-4">
          <Input placeholder="Search materials…" leftIcon={<SearchIcon />} />
          <Input placeholder="Amount" defaultValue="1,250.00" rightIcon={<span className="text-sm">SAR</span>} />
          <Input placeholder="Validating IBAN…" leftIcon={<SearchIcon />} isLoading />
        </div>
      </section>
    </div>
  )
}
