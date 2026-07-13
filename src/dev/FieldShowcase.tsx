import { useState, type FormEvent } from 'react'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import type { UiError } from '@/shared/ui/types'

/**
 * Dev-only harness for Field.
 * Route: /dev/fields  (outside the app Layout).
 *
 * The "Interactive" section is the point: validation on blur/submit, a typed error
 * driving the danger state + message, and a Button that reflects the in-flight 202.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(value: string): UiError | null {
  if (!value.trim()) return { title: 'Email is required' }
  if (!EMAIL_PATTERN.test(value)) return { title: 'Enter a valid email address' }
  return null
}

function InteractiveDemo() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<UiError | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const validationError = validateEmail(email)
    setError(validationError)
    if (validationError) return

    // Mimic the async write path: optimistic pending → confirmed a moment later.
    setSaved(false)
    setIsSaving(true)
    window.setTimeout(() => {
      setIsSaving(false)
      setSaved(true)
    }, 900)
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4" noValidate>
      <Field
        label="Work email"
        required
        type="email"
        placeholder="you@company.com"
        helperText="We'll send the escrow confirmation here."
        value={email}
        error={error}
        onChange={(event) => {
          setEmail(event.target.value)
          if (error) setError(null) // clear the error as the user corrects it
        }}
        onBlur={() => setError(validateEmail(email))}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" isPending={isSaving}>
          Save
        </Button>
        {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
      </div>
    </form>
  )
}

export function FieldShowcase() {
  return (
    <div className="min-h-screen bg-white p-8 text-slate-900">
      <header className="mb-8 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">Field — design-system harness</h1>
        <p className="mt-2 text-sm text-slate-600">
          Label + Input + helper/error, with the a11y wiring done (label association,
          <code> aria-describedby</code>, <code>aria-invalid</code>). Try the interactive form:
          submit empty or with a bad address to see validation; a valid submit shows the Button's
          pending state.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Interactive
          </h2>
          <InteractiveDemo />
        </section>

        <section className="flex max-w-sm flex-col gap-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">States</h2>
          <Field label="Default" placeholder="Placeholder" />
          <Field label="With helper" placeholder="0000 0000 0000" helperText="Your tenant IBAN." />
          <Field label="Required" required placeholder="Required field" />
          <Field
            label="Invalid"
            placeholder="Placeholder"
            error={{ title: 'Invalid IBAN', detail: 'Check the account number.' }}
          />
          <Field label="Disabled" placeholder="Placeholder" disabled />
          <Field label="Large" size="lg" placeholder="Large control" />
        </section>
      </div>
    </div>
  )
}
