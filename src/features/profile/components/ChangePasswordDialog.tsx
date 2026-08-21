import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { CloseButton, Modal } from '@/shared/ui/Modal'
import { Field } from '@/shared/ui/Field'
import { OtpField, EMAIL_OTP_LENGTH } from '@/shared/ui/OtpField'
import { isStrongPassword } from '@/shared/lib/validators'
import { EyeIcon, EyeOffIcon } from '@/features/auth/components/authIcons'
import type { UpdatePasswordFlow } from '../useProfileSecurity'

interface ChangePasswordDialogProps {
  /** The address the code will go to — named up front so nobody presses send blind. */
  email: string
  flow: UpdatePasswordFlow
  onClose: () => void
}

const TITLE_ID = 'change-password-title'

/**
 * ChangePasswordDialog — the signed-out password reset, run from inside the app.
 *
 * Deliberately the same three steps and the same endpoints as the reset reached from the sign-in
 * screen: send a code to the address on file, trade it for a single-use token, spend the token on
 * the new password. Doing it any other way would mean a second way to change a password, with its
 * own bugs, for no gain.
 *
 * Which step shows is derived from the flow (`destination`, then `verified`), so a failure never
 * strands the dialog on a step whose prerequisite did not actually happen.
 *
 * MOUNT THIS ONLY WHILE IT IS OPEN — reopening then starts from a clean, re-masked form because the
 * component unmounted, which also guarantees a previous attempt's password is never left on screen.
 */
export function ChangePasswordDialog({ email, flow, onClose }: ChangePasswordDialogProps) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const strongEnough = isStrongPassword(password)
  const matches = confirm.length > 0 && password === confirm
  const canSave = strongEnough && matches

  const close = () => {
    flow.reset()
    onClose()
  }

  const header = (title: string, body: string) => (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 id={TITLE_ID} className="text-lg font-bold text-content-primary">
          {title}
        </h2>
        <p className="mt-1 text-sm text-content-secondary">{body}</p>
      </div>
      <CloseButton onClose={close} label={t('common.close')} />
    </div>
  )

  // 520px per the design. Marked important because Modal's own max-w-[560px] is a LARGER arbitrary
  // value, and Tailwind emits arbitrary widths in ascending numeric order — without the `!` the
  // default wins on source order, since cn() does not de-duplicate conflicting utilities.
  return (
    <Modal open onClose={close} labelledBy={TITLE_ID} className="!max-w-[520px]">
      {flow.destination === '' ? (
        <>
          {header(t('profile.passwordChange.title'), t('profile.passwordChange.body', { destination: email }))}
          {flow.sendError && (
            <p role="alert" className="mt-4 text-sm text-status-danger">
              {flow.sendError.title}
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <Button isLoading={flow.isSending} onClick={flow.send}>
              {t('auth.sendResetCode')}
            </Button>
          </div>
        </>
      ) : !flow.verified ? (
        <>
          {header(
            t('profile.passwordChange.verifyTitle'),
            t('profile.passwordChange.verifyBody', { destination: flow.destination, length: EMAIL_OTP_LENGTH }),
          )}

          <div className="mt-10 flex justify-center">
            <OtpField
              autoFocus
              length={EMAIL_OTP_LENGTH}
              value={code}
              loading={flow.isVerifying}
              error={flow.verifyError}
              onChange={(digits) => {
                setCode(digits)
                if (flow.verifyError) flow.clearErrors()
                if (digits.length === EMAIL_OTP_LENGTH) flow.verify(digits)
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
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (canSave && !flow.isSaving) flow.save(password)
          }}
        >
          {header(t('auth.newPasswordTitle'), t('auth.passwordRule'))}

          <div className="mt-4 flex flex-col gap-4">
            <Field
              required
              autoFocus
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              label={t('auth.newPasswordLabel')}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={password.length > 0 && !strongEnough ? { title: t('auth.passwordRule') } : null}
              success={strongEnough}
              trailingAction={{
                icon: showPassword ? (
                  <EyeOffIcon className="h-[18px] w-[18px]" />
                ) : (
                  <EyeIcon className="h-[18px] w-[18px]" />
                ),
                label: t('auth.togglePassword'),
                onClick: () => setShowPassword((shown) => !shown),
                pressed: showPassword,
              }}
            />
            <Field
              required
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              label={t('auth.confirmPassword')}
              placeholder="••••••••"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              error={confirm.length > 0 && !matches ? { title: t('auth.passwordMismatch') } : null}
              success={matches}
              trailingAction={{
                icon: showConfirm ? (
                  <EyeOffIcon className="h-[18px] w-[18px]" />
                ) : (
                  <EyeIcon className="h-[18px] w-[18px]" />
                ),
                label: t('auth.togglePassword'),
                onClick: () => setShowConfirm((shown) => !shown),
                pressed: showConfirm,
              }}
            />
          </div>

          {flow.saveError && (
            <p role="alert" className="mt-3 text-sm text-status-danger">
              {flow.saveError.title}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={!canSave} isLoading={flow.isSaving}>
              {t('auth.saveNewPassword')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
