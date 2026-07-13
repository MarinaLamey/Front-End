import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { useAuth } from '@/platform/auth'
import type { UiError } from '@/shared/ui/types'
import { useNafathLogin } from './useNafathLogin'

interface NafathSignInProps {
  /** Call-to-action label, e.g. "Sign in with Nafath" or "Register with Nafath". */
  ctaLabel: string
}

/** Nafath identity entry point (provisional). National ID → approve-on-app → signed in. */
export function NafathSignIn({ ctaLabel }: NafathSignInProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [nationalId, setNationalId] = useState('')
  const [error, setError] = useState<UiError | null>(null)
  const errorId = useId()
  const { status, session, start } = useNafathLogin()

  useEffect(() => {
    if (status === 'completed') {
      login('buyer') // PROVISIONAL: portal/roles will come from the Nafath-issued token.
      navigate('/buyer')
    }
  }, [status, login, navigate])

  const handleStart = () => {
    if (!/^\d{10}$/.test(nationalId)) {
      setError({ title: t('auth.invalidNationalId') })
      return
    }
    setError(null)
    void start(nationalId)
  }

  if (status === 'waiting' && session) {
    return (
      <div className="rounded-lg border border-slate-200 p-4 text-center">
        <p className="my-1 text-4xl font-bold tracking-widest text-brand-primary">
          {session.displayNumber}
        </p>
        <p className="text-sm text-content-primary">{t('auth.confirmNumber')}</p>
        <p className="mt-1 text-xs text-content-tertiary">{t('auth.waiting')}</p>
      </div>
    )
  }

  const wasDeclined = status === 'rejected' || status === 'expired'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-content-tertiary">
        <span className="h-px flex-1 bg-slate-200" />
        {t('common.or')}
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      {wasDeclined && (
        <p className="text-sm text-status-danger">
          {status === 'expired' ? t('auth.expired') : t('auth.declined')}
        </p>
      )}
      <Input
        value={nationalId}
        placeholder={t('auth.nationalId')}
        inputMode="numeric"
        aria-label={t('auth.nationalId')}
        error={error}
        errorId={error ? errorId : undefined}
        onChange={(event) => {
          setNationalId(event.target.value)
          if (error) setError(null)
        }}
      />
      {error && (
        <p id={errorId} className="text-sm text-status-danger">
          {error.title}
        </p>
      )}
      <Button
        type="button"
        variant="secondary"
        fullWidth
        onClick={handleStart}
        isLoading={status === 'initiating'}
      >
        {ctaLabel}
      </Button>
    </div>
  )
}
