/**
 * The three shapes a failure takes on screen. Kept in their own module so `ErrorState` can name a
 * variant without pulling in the Lottie player — that chunk is only fetched once something has
 * actually failed.
 *
 * - `offline`   — the request never reached us (no response: dropped connection, DNS, timeout).
 * - `forbidden` — it reached us and we were told no (401/403). Retrying will not help.
 * - `server`    — it reached us and broke (5xx, or anything we cannot classify). Retrying might.
 */
export type ErrorVariant = 'offline' | 'forbidden' | 'server'

/** i18n key stem under `common.error` for each variant's title + message. */
export const VARIANT_KEY: Record<ErrorVariant, string> = {
  offline: 'offline',
  forbidden: 'forbidden',
  server: 'server',
}
