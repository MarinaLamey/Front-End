import { useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, type Seat } from '@/platform/auth'
import { setLocale, type Locale } from '@/platform/i18n'
import { cn } from '@/shared/lib/cn'
import { displayMobile, isNameOnly } from '@/shared/lib/validators'
import { Field } from '@/shared/ui/Field'
import { Button } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Select'
import { Spinner } from '@/shared/ui/Spinner'
import { Switch } from '@/shared/ui/Switch'
import { ChangeContactDialog } from './components/ChangeContactDialog'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'
import { useProfile, useSaveProfile } from './useProfile'
import { useUpdateEmail, useUpdatePassword, useUpdatePhone } from './useProfileSecurity'
import type { Profile } from './services/profileApi'

/** The seat decides which profile you see; `viewer` reads like a buyer with fewer powers. */
type ProfileVariant = 'admin' | 'buyer' | 'supplier'

const VARIANT_BY_SEAT: Record<Seat, ProfileVariant> = {
  orgAdmin: 'admin',
  buyer: 'buyer',
  supplier: 'supplier',
  viewer: 'buyer',
}

const ROLE_PILL: Record<ProfileVariant, string> = {
  admin: 'bg-brand-subtle text-brand-primary',
  buyer: 'bg-status-info-subtle text-status-info',
  supplier: 'bg-status-success-subtle text-status-success-strong',
}

/**
 * The same two options the {@link LanguageToggle} on the public/auth screens offers. Each language
 * is named IN ITSELF, which is why the labels aren't translated — an Arabic speaker looking for
 * their language scans for "العربية", not for whatever the current UI language calls it.
 */
const LANGUAGES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]

/** Which verified change is open. Only ever one at a time. */
type OpenDialog = 'email' | 'phone' | 'password' | null

/** First+last initial for the identity monogram. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U'
}

function ContactRow({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-content-primary">{title}</p>
        <p className="text-sm text-content-tertiary">{desc}</p>
      </div>
      {children}
    </div>
  )
}

/**
 * ProfilePage — "Your profile". One role-aware page with three faces, chosen by the SEAT the
 * signed-in person holds: an Org Admin who runs the organisation, a buyer who sources, and a
 * supplier who sells. The seat changes the identity card, the notification copy and whether the
 * device-wide sign-out is offered — an Org Admin is the only one who can end other sessions.
 *
 * Name and job title are ordinary fields saved by "Save changes". Email, phone and password are
 * NOT: each is a credential, so each is changed through a dialog that sends a code to the new
 * destination and only commits once that code comes back.
 */
export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const signOut = useAuth((state) => state.logout)
  const { seat, data: profile, isLoading } = useProfile()
  const save = useSaveProfile()

  const variant = VARIANT_BY_SEAT[seat]
  // Narrowed the same way LanguageToggle does it — i18n.language can carry a region suffix.
  const locale: Locale = i18n.language === 'ar' ? 'ar' : 'en'

  const [dialog, setDialog] = useState<OpenDialog>(null)
  const closeDialog = () => setDialog(null)
  const emailChange = useUpdateEmail({ onDone: closeDialog })
  const phoneChange = useUpdatePhone({ onDone: closeDialog })
  const passwordChange = useUpdatePassword({ onDone: closeDialog })

  // Unsaved edits are TAGGED with the seat they belong to, so switching seats falls back to the
  // loaded profile without an effect reaching in to clear state — and a refetch can never stomp on
  // what someone is halfway through typing.
  const [draft, setDraft] = useState<{ seat: Seat; profile: Profile } | null>(null)
  const edited = draft?.seat === seat ? draft.profile : null
  const current = edited ?? profile ?? null

  const patch = (changes: Partial<Profile>) => {
    if (!current) return
    setDraft({ seat, profile: { ...current, ...changes } })
  }
  const setFullName = (event: ChangeEvent<HTMLInputElement>) => patch({ fullName: event.target.value })
  const setJobTitle = (event: ChangeEvent<HTMLInputElement>) => patch({ jobTitle: event.target.value })
  const setContact = (key: keyof Profile['contact']) => (value: boolean) =>
    patch({ contact: { ...(current?.contact ?? { email: true, inApp: true }), [key]: value } })

  if (isLoading || !current) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // Only the free-text fields are validated here; email and phone are proved by a code instead.
  const nameError = current.fullName.trim() !== '' && !isNameOnly(current.fullName)
  const canSave = current.fullName.trim() !== '' && !nameError && edited !== null

  /**
   * Format a date the profile MIGHT not have, returning null when it does not.
   *
   * `memberSince` is empty until onboarding reports a `completedAt`, and `passwordChangedAt` is
   * empty until this page changes it (see profileApi). `Intl.DateTimeFormat.format()` throws
   * `RangeError: Invalid time value` on an Invalid Date, so formatting either one unguarded took the
   * whole page down with "Unexpected Application Error". Returning null lets the caller drop the
   * line, which is what profileApi says this page should do: hide it rather than guess.
   */
  const formatDate = (iso: string, options: Intl.DateTimeFormatOptions, suffix = '') => {
    if (!iso) return null
    const date = new Date(`${iso}${suffix}`)
    return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(i18n.language, options).format(date)
  }
  // `-01` makes an ISO month (`2026-01`) a parseable date; without a day it is not one.
  const monthYear = (iso: string) => formatDate(iso, { month: 'short', year: 'numeric' }, '-01')
  const dateFull = (iso: string) => formatDate(iso, { day: '2-digit', month: 'short', year: 'numeric' })

  const memberSince = monthYear(current.memberSince)
  const passwordChanged = dateFull(current.passwordChangedAt)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">{t('profile.title')}</h1>
          <p className="mt-1 text-sm text-content-secondary">{t('profile.subtitle')}</p>
        </div>
        <Button
          disabled={!canSave}
          isLoading={save.isPending}
          onClick={() => save.mutate({ seat, profile: current }, { onSuccess: () => setDraft(null) })}
        >
          {t('profile.saveChanges')}
        </Button>
      </div>

      {/* The identity column is a fixed 320px in the design, not a third of the row — the cards on
          the left need the slack, and the identity card's content does not grow with the viewport. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-border-subtle bg-bg-surface shadow-sm p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-content-primary">{t('profile.personalDetails')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('profile.fullName')}
                value={current.fullName}
                onChange={setFullName}
                error={nameError ? { title: t('profile.errors.name') } : undefined}
              />
              <Field label={t('profile.jobTitle')} value={current.jobTitle} onChange={setJobTitle} />
              {/* Email and phone are READ-ONLY here. Both are sign-in credentials, so changing one
                  has to prove the new destination is reachable before the old one is given up —
                  which is the dialog's job, not a text field's. */}
              <Field
                readOnly
                type="email"
                label={t('profile.email')}
                value={current.email}
                trailingAction={{
                  icon: t('profile.edit'),
                  label: t('profile.editEmail'),
                  onClick: () => setDialog('email'),
                  tone: 'brand',
                }}
              />
              <Field
                readOnly
                inputMode="tel"
                label={t('profile.phone')}
                value={displayMobile(current.mobile)}
                trailingAction={{
                  icon: t('profile.edit'),
                  label: t('profile.editPhone'),
                  onClick: () => setDialog('phone'),
                  tone: 'brand',
                }}
              />
              {/* Language is the LIVE app locale, not a stored preference string. Picking one runs
                  the same `setLocale` as the LanguageToggle on the sign-in / register screens:
                  i18next switches, `dir` flips to rtl/ltr, and the choice is persisted — no Save
                  needed, and none of the other fields are touched. The <label> wraps the control so
                  the visible text is its accessible name without Select needing an id. */}
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-content-primary">{t('profile.language')}</span>
                <Select
                  value={locale}
                  onChange={(value) => setLocale(value === 'ar' ? 'ar' : 'en')}
                  options={LANGUAGES}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-surface shadow-sm p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-content-primary">{t('profile.security')}</h2>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-surface-sunken px-4 py-3">
              <div>
                <p className="text-sm font-medium text-content-primary">{t('profile.password')}</p>
                {passwordChanged && (
                  <p className="text-xs text-content-tertiary">
                    {t('profile.passwordLastChanged', { date: passwordChanged })}
                  </p>
                )}
              </div>
              <Button variant="subtle" size="sm" onClick={() => setDialog('password')}>
                {t('profile.change')}
              </Button>
            </div>
            {/* Ending other people's sessions is an organisation-wide act — Org Admins only. */}
            {variant === 'admin' && (
              <Button variant="subtle" fullWidth className="mt-3">
                {t('profile.signOutAllDevices')}
              </Button>
            )}
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-surface shadow-sm p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-content-primary">{t('profile.contactsTitle')}</h2>
            <div className="flex flex-col gap-4">
              <ContactRow title={t('profile.email')} desc={t(`profile.roles.${variant}.email`)}>
                <Switch checked={current.contact.email} onChange={setContact('email')} label={t('profile.email')} />
              </ContactRow>
              <ContactRow title={t('profile.inApp')} desc={t('profile.inAppDesc')}>
                <Switch checked={current.contact.inApp} onChange={setContact('inApp')} label={t('profile.inApp')} />
              </ContactRow>
              <ContactRow title={t('profile.sms')} desc={t('profile.smsDesc')}>
                <Switch checked disabled onChange={() => {}} label={t('profile.sms')} />
              </ContactRow>
            </div>
          </section>
        </div>

        {/* Identity — who you are and the way out, in one card. `self-start` keeps it hugging its
            content instead of stretching down the full height of the taller left column. */}
        <section className="self-start rounded-2xl border border-border-subtle bg-bg-surface shadow-sm p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm font-semibold text-brand-primary shadow-sm">
              {initials(current.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-content-primary">{current.fullName}</p>
              <p className="truncate text-sm text-content-tertiary">{current.organisation}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', ROLE_PILL[variant])}>
              {t(`profile.roles.${variant}.label`)}
            </span>
            {memberSince && (
              <span className="rounded-full bg-bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-content-secondary">
                {t('profile.memberSince', { date: memberSince })}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-content-secondary">{t(`profile.roles.${variant}.desc`)}</p>
          <button
            type="button"
            onClick={() => {
              signOut()
              navigate('/login')
            }}
            className="mp-press mt-4 w-full cursor-pointer rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-status-danger hover:bg-status-danger-subtle"
          >
            {t('common.signOut')}
          </button>
        </section>
      </div>

      {/* Mounted only while open, so each one starts from a clean form without an effect. */}
      {dialog === 'email' && (
        <ChangeContactDialog channel="email" current={current.email} flow={emailChange} onClose={closeDialog} />
      )}
      {dialog === 'phone' && (
        <ChangeContactDialog channel="sms" current={current.mobile} flow={phoneChange} onClose={closeDialog} />
      )}
      {dialog === 'password' && (
        <ChangePasswordDialog email={current.email} flow={passwordChange} onClose={closeDialog} />
      )}
    </div>
  )
}
