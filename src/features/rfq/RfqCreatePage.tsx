import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { useCreateRfq } from './hooks/useCreateRfq'

export function RfqCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const { submit, status } = useCreateRfq()

  const isPending = status === 'pending'
  const isConfirmed = status === 'confirmed'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    void submit({ title })
  }

  return (
    <section className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.newRfq')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          label={t('rfq.rfqTitle')}
          placeholder={t('rfq.rfqTitlePlaceholder')}
          value={title}
          disabled={isPending || isConfirmed}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" isPending={isPending} disabled={isConfirmed}>
            {t('rfq.submitRfq')}
          </Button>
          {isPending && (
            <span className="text-sm text-content-tertiary">{t('rfq.submittedAwaiting')}</span>
          )}
          {isConfirmed && <span className="text-sm text-emerald-600">{t('rfq.confirmed')}</span>}
        </div>
      </form>

      {isConfirmed && (
        <Button variant="ghost" onClick={() => navigate('/buyer/rfqs')}>
          {t('rfq.backToRfqs')}
        </Button>
      )}
    </section>
  )
}
