import { useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, type Seat } from '@/platform/auth'
import { cn } from '@/shared/lib/cn'
import { cleanMobile, isEmail, isNameOnly, isSaudiMobile } from '@/shared/lib/validators'
import { Field } from '@/shared/ui/Field'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Switch } from '@/shared/ui/Switch'
import { useProfile, useSaveProfile } from './useProfile'
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
 * Mobiles are STORED as the nine digits after the country code and SHOWN in the dialling form, so
 * the field reads back the way it was offered ("+966 51 234 5678") without the stored value ever
 * carrying punctuation the validator would have to strip again.
 */
function displayMobile(digits: string): string {
  if (!digits) return ''
  const [, a = '', b = '', c = ''] = /^(\d{0,2})(\d{0,3})(\d{0,4})$/.exec(digits) ?? []
  return `+966 ${[a, b, c].filter(Boolean).join(' ')}`.trimEnd()
}

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
 */
export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const signOut = useAuth((state) => state.logout)
  const { seat, data: profile, isLoading } = useProfile()
  const save = useSaveProfile()

  const variant = VARIANT_BY_SEAT[seat]

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
  const set = (key: keyof Profile) => (event: ChangeEvent<HTMLInputElement>) =>
    patch({ [key]: key === 'mobile' ? cleanMobile(event.target.value) : event.target.value } as Partial<Profile>)
  const setContact = (key: keyof Profile['contact']) => (value: boolean) =>
    patch({ contact: { ...(current?.contact ?? { email: true, inApp: true }), [key]: value } })

  if (isLoading || !current) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // Validated with the shared rules, so the profile can't save a name with digits in it or a
  // mobile that isn't a Saudi number.
  const nameError = current.fullName.trim() && !isNameOnly(current.fullName)
  const emailError = current.email.trim() && !isEmail(current.email)
  const mobileError = current.mobile.trim() && !isSaudiMobile(current.mobile)
  const complete = current.fullName.trim() && current.email.trim()
  const canSave = Boolean(complete) && !nameError && !emailError && !mobileError && edited !== null

  const monthYear = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'short', year: 'numeric' }).format(new Date(`${iso}-01`))
  const dateFull = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))

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

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-content-primary">{t('profile.personalDetails')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('profile.fullName')}
                value={current.fullName}
                onChange={set('fullName')}
                error={nameError ? { title: t('profile.errors.name') } : undefined}
              />
              <Field label={t('profile.jobTitle')} value={current.jobTitle} onChange={set('jobTitle')} />
              <Field
                label={t('profile.workEmail')}
                type="email"
                value={current.email}
                onChange={set('email')}
                error={emailError ? { title: t('profile.errors.email') } : undefined}
              />
              <Field
                label={t('profile.mobile')}
                inputMode="tel"
                placeholder="+966 5X XXX XXXX"
                value={displayMobile(current.mobile)}
                onChange={set('mobile')}
                error={mobileError ? { title: t('profile.errors.mobile') } : undefined}
              />
              <Field label={t('profile.language')} value={current.language} onChange={set('language')} />
              <Field label={t('profile.timeZone')} value={current.timeZone} onChange={set('timeZone')} />
            </div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-content-primary">{t('profile.security')}</h2>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-surface-sunken px-4 py-3">
              <div>
                <p className="text-sm font-medium text-content-primary">{t('profile.password')}</p>
                <p className="text-xs text-content-tertiary">
                  {t('profile.passwordLastChanged', { date: dateFull(current.passwordChangedAt) })}
                </p>
              </div>
              <Button variant="secondary" size="sm">
                {t('profile.change')}
              </Button>
            </div>
            {/* Ending other people's sessions is an organisation-wide act — Org Admins only. */}
            {variant === 'admin' && (
              <button
                type="button"
                className="mp-press mt-3 w-full cursor-pointer rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-content-secondary hover:bg-interactive-hover"
              >
                {t('profile.signOutAllDevices')}
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
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

        {/* Identity + sign-out column */}
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm font-semibold text-brand-primary">
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
              <span className="rounded-full bg-bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-content-secondary">
                {t('profile.memberSince', { date: monthYear(current.memberSince) })}
              </span>
            </div>
            <p className="mt-3 text-sm text-content-secondary">{t(`profile.roles.${variant}.desc`)}</p>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-surface p-4">
            <button
              type="button"
              onClick={() => {
                signOut()
                navigate('/login')
              }}
              className="mp-press w-full cursor-pointer rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-status-danger hover:bg-status-danger-subtle"
            >
              {t('common.signOut')}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
