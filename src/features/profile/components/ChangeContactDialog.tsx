import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { CloseButton, Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/Field'
import { OtpField, otpLengthFor } from '@/shared/ui/OtpField'
import { cleanMobile, displayMobile, isEmail, isSaudiMobile } from '@/shared/lib/validators'
import type { ContactChannel, UpdateContactFlow } from '../useProfileSecurity'

interface ChangeContactDialogProps {
  /** Email (6-digit code) or SMS (4-digit). Decides every label and the validation rule. */
  channel: ContactChannel
  /** The value being replaced — a new one that matches it is rejected before any code is sent. */
  current: string
  flow: UpdateContactFlow
  onClose: () => void
}

/**
 * ChangeContactDialog — the two-step change behind the "Edit" beside email and phone.
 *
 * Step 1 takes the new destination; step 2 takes the code sent to it. The step is read off
 * `flow.destination` rather than kept here, so there is one source of truth for how far along the
 * change is and a failed send can never strand the dialog on the code screen.
 *
 * The old value stays live throughout — the profile only changes when the code comes back correct,
 * which is the whole point of doing this in a dialog instead of in the field.
 *
 * MOUNT THIS ONLY WHILE IT IS OPEN. Reopening gets a clean form because the component unmounted,
 * not because an effect reached in to clear it.
 */
export function ChangeContactDialog({ channel, current, flow, onClose }: ChangeContactDialogProps) {
  const { t } = useTranslation()
  const isEmailChannel = channel === 'email'
  const length = otpLengthFor(channel)

  const [value, setValue] = useState('')
  const [code, setCode] = useState('')

  const entered = isEmailChannel ? value.trim() : value
  const wellFormed = isEmailChannel ? isEmail(entered) : isSaudiMobile(entered)
  // Sending a code to the address they already have would verify nothing.
  const unchanged = entered !== '' && entered === current
  const canSend = wellFormed && !unchanged

  const namespace = isEmailChannel ? 'email' : 'phone'
  const titleId = 'change-contact-title'

  const close = () => {
    flow.reset()
    onClose()
  }

  // 520px per the design. Marked important because Modal's own max-w-[560px] is a LARGER arbitrary
  // value, and Tailwind emits arbitrary widths in ascending numeric order — without the `!` the
  // default wins on source order, since cn() does not de-duplicate conflicting utilities.
  return (
    <Modal open onClose={close} labelledBy={titleId} className="!max-w-[520px]">
      {flow.destination === '' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (canSend && !flow.isSending) flow.send(entered)
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-bold text-content-primary">
                {t(`profile.contactChange.${namespace}.title`)}
              </h2>
              <p className="mt-1 text-sm text-content-secondary">
                {t(`profile.contactChange.${namespace}.body`)}
              </p>
            </div>
            <CloseButton onClose={close} label={t('common.close')} />
          </div>

          <div className="mt-4">
            <Field
              required
              autoFocus
              type={isEmailChannel ? 'email' : 'tel'}
              inputMode={isEmailChannel ? 'email' : 'tel'}
              autoComplete={isEmailChannel ? 'email' : 'tel'}
              label={t(`profile.contactChange.${namespace}.label`)}
              placeholder={isEmailChannel ? t('profile.contactChange.email.placeholder') : '+966 5X XXX XXXX'}
              helperText={t(`profile.contactChange.${namespace}.helper`)}
              value={isEmailChannel ? value : displayMobile(value)}
              onChange={(event) => setValue(isEmailChannel ? event.target.value : cleanMobile(event.target.value))}
              error={
                unchanged
                  ? { title: t(`profile.errors.${namespace}Unchanged`) }
                  : (flow.sendError ?? (entered !== '' && !wellFormed ? { title: t(`profile.errors.${namespace}`) } : null))
              }
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={!canSend} isLoading={flow.isSending}>
              {t('auth.verify')}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-bold text-content-primary">
                {t(`profile.contactChange.${namespace}.verifyTitle`)}
              </h2>
              <p className="mt-1 text-sm text-content-secondary">
                {t(`profile.contactChange.${namespace}.verifyBody`, {
                  destination: isEmailChannel ? flow.destination : displayMobile(flow.destination),
                  length,
                })}
              </p>
            </div>
            <CloseButton onClose={close} label={t('common.close')} />
          </div>

          {/* Boxes centre in the dialog, unlike the auth screens where they sit in a form column. */}
          <div className="mt-10 flex justify-center">
            <OtpField
              autoFocus
              length={length}
              value={code}
              loading={flow.isConfirming}
              error={flow.confirmError}
              onChange={(digits) => {
                setCode(digits)
                if (flow.confirmError) flow.clearErrors()
                // A code is only ever the one length, so there is nothing to press once it is full.
                if (digits.length === length) flow.confirm(digits)
              }}
            />
          </div>

          <p className="mt-10 flex items-center gap-1.5 text-xs text-content-tertiary">
            <span>{t('profile.contactChange.expires', { count: 5 })}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setCode('')
                flow.resend()
              }}
              disabled={flow.isSending}
              className="cursor-pointer font-medium text-content-link hover:text-content-link-hover disabled:opacity-50"
            >
              {t('profile.contactChange.resend')}
            </button>
          </p>
        </>
      )}
    </Modal>
  )
}
