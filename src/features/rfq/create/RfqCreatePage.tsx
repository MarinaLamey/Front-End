import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { AnonymousAside } from './components/AnonymousAside'
import { ArrowLeftIcon, ArrowRightIcon } from './components/icons'
import { RfqResultCard } from './components/RfqResultCard'
import { RfqStepper } from './components/RfqStepper'
import { RequirementStep } from './steps/RequirementStep'
import { DeliveryTermsStep } from './steps/DeliveryTermsStep'
import { SuppliersStep } from './steps/SuppliersStep'
import { ReviewStep } from './steps/ReviewStep'
import { useRfqWizard } from './useRfqWizard'

/** "Saved · just now" → minutes → hours → days. `elapsed` is in milliseconds. */
function relativeSaved(elapsed: number, t: TFunction): string {
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return t('rfq.create.saved.justNow')
  if (minutes < 60) return t('rfq.create.saved.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('rfq.create.saved.hoursAgo', { count: hours })
  return t('rfq.create.saved.daysAgo', { count: Math.floor(hours / 24) })
}

const SUBTITLE_KEY: Record<number, string> = {
  1: 'rfq.create.subtitle.requirement',
  2: 'rfq.create.subtitle.delivery',
  3: 'rfq.create.subtitle.suppliers',
  4: 'rfq.create.subtitle.review',
}

/**
 * RfqCreatePage — the 4-step Create-RFQ wizard. Binds the persisted draft to the stepper, the
 * active step and the footer actions; on a terminal outcome it swaps the whole surface for the
 * result card. Publish vs verify-to-publish is decided by the org's verification status.
 */
export function RfqCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const wizard = useRfqWizard()
  const {
    step,
    draft,
    result,
    hasHydrated,
    verified,
    amending,
    savedAt,
    setStep,
    patch,
    setPreset,
    setMilestones,
    goNext,
    goBack,
    canContinue,
    saveDraft,
    submitRfq,
    isSaving,
    isSubmitting,
    setResult,
    reset,
  } = wizard

  // On every step change (Next/Back and the Review "Edit" jumps), bring the page top back into
  // view — the action buttons sit at the bottom, so a step switch otherwise lands mid-scroll.
  const topRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  // Every edit is written straight to local storage by the draft store, which stamps `savedAt`, so
  // the footer can state when the work was last kept. A slow tick keeps the phrasing honest while
  // the buyer sits reading the review instead of typing.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const savedAgo = relativeSaved(now - savedAt, t)

  // Wait for the persisted draft to rehydrate so we never flash a blank over saved work.
  if (!hasHydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (result) {
    const leave = (to: string) => {
      reset()
      navigate(to)
    }
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <RfqResultCard
          result={result}
          onAction={(action) => {
            switch (action) {
              case 'continueEditing':
                setResult(null)
                break
              case 'backToDashboard':
              case 'verifyOrg':
                leave('/buyer')
                break
              case 'viewRfq':
              case 'trackBids':
                leave('/buyer/rfqs')
                break
            }
          }}
        />
      </div>
    )
  }

  const topBack = () => (step === 1 ? navigate('/buyer') : goBack())

  return (
    <div ref={topRef} className="mx-auto w-full max-w-5xl px-4 py-6">
      <button
        type="button"
        onClick={topBack}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-content-secondary transition-colors hover:text-content-primary"
      >
        <ArrowLeftIcon className="h-4 w-4 rtl:-scale-x-100" />
        {step === 1 ? t('rfq.create.backToDashboard') : t('rfq.create.back')}
      </button>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            {t('rfq.create.heading')}
          </h1>
          <p className="mt-1 text-sm text-content-secondary">{t(SUBTITLE_KEY[step])}</p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand-strong">
          {t('rfq.create.anonymous.pill')}
        </span>
      </div>

      <RfqStepper current={step} className="mx-auto my-8 max-w-3xl" />

      <div className={cn('grid gap-6', step < 4 && 'lg:grid-cols-[minmax(0,1fr)_320px]')}>
        {/* key={step} remounts the column on each step change so its card cascade replays */}
        <div key={step}>
          {step === 1 && <RequirementStep draft={draft} patch={patch} amending={amending} />}
          {step === 2 && (
            <DeliveryTermsStep
              draft={draft}
              patch={patch}
              setPreset={setPreset}
              setMilestones={setMilestones}
            />
          )}
          {step === 3 && <SuppliersStep draft={draft} patch={patch} amending={amending} />}
          {step === 4 && (
            <ReviewStep
              draft={draft}
              patch={patch}
              setPreset={setPreset}
              setMilestones={setMilestones}
              onEdit={setStep}
              verified={verified}
            />
          )}
        </div>
        {step < 4 && (
          <div className="lg:pt-1">
            <AnonymousAside />
          </div>
        )}
      </div>

      {/* What submitting will do is stated inside the Review card itself (step 4), where the buyer
          is reading; the footer stays purely actions. */}
      <div className="mt-8 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          {/* Save draft is available on EVERY step, the last one included — a buyer who reaches
              Review and isn't ready to publish must still be able to park the work. */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={saveDraft} isLoading={isSaving}>
              {t('rfq.create.saveDraft')}
            </Button>
            <span className="text-sm text-content-tertiary">{savedAgo}</span>
          </div>

          {step < 4 ? (
            <Button
              onClick={goNext}
              disabled={!canContinue}
              rightIcon={<ArrowRightIcon className="h-4 w-4 rtl:-scale-x-100" />}
            >
              {t('rfq.create.next')}
            </Button>
          ) : (
            <Button
              onClick={submitRfq}
              isLoading={isSubmitting}
              rightIcon={<ArrowRightIcon className="h-4 w-4 rtl:-scale-x-100" />}
            >
              {verified ? t('rfq.create.publish') : t('rfq.create.saveAsDraft')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
