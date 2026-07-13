import type { Portal } from '@/platform/auth'

export interface NavItem {
  label: string
  to: string
  /** Match the path exactly (for index routes). */
  end?: boolean
}

export interface PortalConfig {
  id: Portal
  label: string
  basePath: string
  nav: NavItem[]
}

// `label` fields hold i18n keys, resolved with t() in PortalLayout.
export const BUYER_PORTAL: PortalConfig = {
  id: 'buyer',
  label: 'portals.buyer',
  basePath: '/buyer',
  nav: [
    { label: 'nav.dashboard', to: '/buyer', end: true },
    { label: 'nav.catalogue', to: '/buyer/catalogue' },
    { label: 'nav.rfqs', to: '/buyer/rfqs' },
    { label: 'nav.settlement', to: '/buyer/settlement' },
  ],
}
