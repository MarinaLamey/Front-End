import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from '@/features/marketing'
import { PortalLayout } from '@/app/layouts/PortalLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { BUYER_PORTAL } from '@/app/portals'
import { RequireAuth } from '@/platform/auth'
import { LoginPage } from '@/features/auth'
import { OnboardingPage } from '@/features/onboarding'
import { DashboardPage } from '@/features/dashboard'
import { CataloguePage } from '@/features/catalogue'
import { RfqListPage, RfqCreatePage } from '@/features/rfq'
import { SettlementPage } from '@/features/settlement'
import { ButtonShowcase } from '@/dev/ButtonShowcase'
import { InputShowcase } from '@/dev/InputShowcase'
import { FieldShowcase } from '@/dev/FieldShowcase'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },

  // Sign-in and register are their own full-screen split-shell pages.
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <OnboardingPage /> },

  // Buyer portal (auth-gated).
  {
    path: '/buyer',
    element: (
      <RequireAuth>
        <PortalLayout portal={BUYER_PORTAL} />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'catalogue', element: <CataloguePage /> },
      { path: 'rfqs', element: <RfqListPage /> },
      { path: 'rfqs/new', element: <RfqCreatePage /> },
      { path: 'settlement', element: <SettlementPage /> },
    ],
  },

  // Dev-only design-system harnesses (full-canvas, outside the app Layout).
  { path: '/dev/buttons', element: <ButtonShowcase /> },
  { path: '/dev/inputs', element: <InputShowcase /> },
  { path: '/dev/fields', element: <FieldShowcase /> },

  { path: '*', element: <NotFoundPage /> },
])
