import { useState } from 'react'

interface UseNewPasswordOptions {
  /** The new password has been saved → advance to the success screen. */
  onSaved: () => void
}

/** State for the choose-new-password card, with no markup. */
export interface UseNewPasswordResult {
  password: string
  setPassword: (value: string) => void
  confirm: string
  setConfirm: (value: string) => void
  showPassword: boolean
  toggleShowPassword: () => void
  showConfirm: boolean
  toggleShowConfirm: () => void
  /** At least 8 chars, with a letter and a number. */
  strongEnough: boolean
  passwordsMatch: boolean
  canSave: boolean
  isSaving: boolean
  save: () => void
}

/**
 * useNewPassword — the choose-new-password behavior, with no markup. Owns both fields, the
 * show/hide toggles, and the strength + match rules. "Save" is a mock (client-side delay);
 * swap it for `api.resetPassword` when the BFF exists.
 */
export function useNewPassword({ onSaved }: UseNewPasswordOptions): UseNewPasswordResult {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const strongEnough = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)
  const passwordsMatch = confirm.length > 0 && password === confirm
  const canSave = strongEnough && passwordsMatch

  const save = () => {
    if (!canSave || isSaving) return
    setIsSaving(true)
    window.setTimeout(() => {
      setIsSaving(false)
      onSaved()
    }, 700)
  }

  return {
    password,
    setPassword,
    confirm,
    setConfirm,
    showPassword,
    toggleShowPassword: () => setShowPassword((prev) => !prev),
    showConfirm,
    toggleShowConfirm: () => setShowConfirm((prev) => !prev),
    strongEnough,
    passwordsMatch,
    canSave,
    isSaving,
    save,
  }
}
