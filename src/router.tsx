import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from '@/features/marketing'
import { PortalShell } from '@/app/layouts/PortalShell'
import { ComingSoonPage } from '@/app/ComingSoonPage'
import { NotFoundPage } from '@/app/NotFoundPage'
import { BUYER_PORTAL, SUPPLIER_PORTAL } from '@/app/portals'
import { RequireAuth, RequireRole } from '@/platform/auth'
import { LoginPage } from '@/features/auth'
import { OnboardingPage } from '@/features/onboarding'
import { PrivacyPolicyPage } from '@/features/legal/PrivacyPolicyPage'
import { TermsPage } from '@/features/legal/TermsPage'
import { BuyerDashboardPage, SupplierDashboardPage } from '@/features/dashboard'
import { AdminShell, AdminVerificationsPage } from '@/features/admin'
import { SubscriptionPlansPage, SubscriptionCheckoutPage } from '@/features/subscription'
import {
  AwardConfirmedPage,
  BidsInboxPage,
  CompareBidsPage,
  RfqCreatePage,
  RfqDetailPage,
  RfqListPage,
} from '@/features/rfq'
import { ButtonShowcase } from '@/dev/ButtonShowcase'
import { InputShowcase } from '@/dev/InputShowcase'
import { FieldShowcase } from '@/dev/FieldShowcase'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },

  // Sign-in and register are their own full-screen split-shell pages.
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <OnboardingPage /> },

  // Public legal document.
  { path: '/privacy', element: <PrivacyPolicyPage /> },
  { path: '/terms', element: <TermsPage /> },

  // Buyer portal (auth-gated). VerificationProvider drives the pending/verified/rejected states.
  {
    path: '/buyer',
    element: (
      <RequireAuth>
        <PortalShell portal={BUYER_PORTAL} />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <BuyerDashboardPage /> },
      { path: 'bids', element: <BidsInboxPage /> },
      { path: 'rfqs', element: <RfqListPage /> },
      { path: 'rfqs/new', element: <RfqCreatePage /> },
      { path: 'rfqs/:id', element: <RfqDetailPage /> },
      { path: 'rfqs/:id/compare', element: <CompareBidsPage /> },
      { path: 'rfqs/:id/award', element: <AwardConfirmedPage /> },
      { path: 'negotiations', element: <ComingSoonPage /> },
      { path: 'orders', element: <ComingSoonPage /> },
      { path: 'suppliers', element: <ComingSoonPage /> },
      { path: 'documents', element: <ComingSoonPage /> },
      { path: 'analytics', element: <ComingSoonPage /> },
      { path: 'subscription', element: <SubscriptionPlansPage /> },
      { path: 'subscription/checkout', element: <SubscriptionCheckoutPage /> },
    ],
  },

  // Supplier portal (auth-gated). Shares the shell + verification flow with the buyer.
  {
    path: '/supplier',
    element: (
      <RequireAuth>
        <PortalShell portal={SUPPLIER_PORTAL} />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <SupplierDashboardPage /> },
      { path: 'rfqs', element: <ComingSoonPage /> },
      { path: 'bids', element: <ComingSoonPage /> },
      { path: 'negotiations', element: <ComingSoonPage /> },
      { path: 'orders', element: <ComingSoonPage /> },
      { path: 'buyers', element: <ComingSoonPage /> },
      { path: 'documents', element: <ComingSoonPage /> },
      { path: 'analytics', element: <ComingSoonPage /> },
      { path: 'subscription', element: <SubscriptionPlansPage /> },
      { path: 'subscription/checkout', element: <SubscriptionCheckoutPage /> },
    ],
  },

  // Super-admin (back-office) console — role-gated. Entered via `enterAdmin()` from the portal.
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <RequireRole role="SuperAdmin">
          <AdminShell />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AdminVerificationsPage /> },
      { path: 'verifications', element: <AdminVerificationsPage /> },
    ],
  },

  // Dev-only design-system harnesses (full-canvas, outside the app Layout).
  { path: '/dev/buttons', element: <ButtonShowcase /> },
  { path: '/dev/inputs', element: <InputShowcase /> },
  { path: '/dev/fields', element: <FieldShowcase /> },

  { path: '*', element: <NotFoundPage /> },
])
