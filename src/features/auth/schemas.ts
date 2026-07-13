import { z } from 'zod'
import type { TFunction } from 'i18next'

// Schemas are built from `t` so validation messages follow the active language.
// Components memoize the schema on `t` (stable per language).

const emailField = (t: TFunction) =>
  z
    .string()
    .trim()
    .min(1, t('validation.emailRequired'))
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), t('validation.emailInvalid'))

export const makeLoginSchema = (t: TFunction) =>
  z.object({
    email: emailField(t),
    password: z.string().min(1, t('validation.passwordRequired')),
    rememberMe: z.boolean().optional(),
  })

export type LoginValues = z.infer<ReturnType<typeof makeLoginSchema>>

// HLD §5.1 registration capture: org-level fields + confirm password.
export const makeRegisterSchema = (t: TFunction) =>
  z
    .object({
      organizationName: z.string().trim().min(1, t('validation.organizationRequired')),
      cr: z
        .string()
        .trim()
        .regex(/^\d{10}$/, t('validation.crInvalid')),
      mobile: z
        .string()
        .trim()
        .regex(/^(?:\+9665\d{8}|05\d{8})$/, t('validation.mobileInvalid')),
      email: emailField(t),
      password: z.string().min(8, t('validation.passwordMin8')),
      confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
      terms: z.boolean().refine((value) => value, { message: t('validation.termsRequired') }),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t('validation.passwordMismatch'),
      path: ['confirmPassword'],
    })

export type RegisterValues = z.infer<ReturnType<typeof makeRegisterSchema>>
