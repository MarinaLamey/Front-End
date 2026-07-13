import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '@/app/providers/AppProviders'
import { router } from '@/router'
import '@/platform/i18n'
// Self-hosted Inter (variable) — the app's primary typeface; Arabic falls back to the system
// Arabic font via the `--font-sans` stack in index.css.
import '@fontsource-variable/inter'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
