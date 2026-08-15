import type { ComponentType } from 'react'
import type { Portal } from '@/platform/auth'
import { GridIcon, FileIcon, ScaleIcon, ChatIcon, BoxIcon, UsersIcon, BankIcon, SettingsIcon } from '@/shared/ui/dashboard'

export interface NavItem {
  /** i18n key, resolved with t() in the shell. */
  label: string
  /** Route to link to. Omitted on a group header (which only expands/collapses its `children`). */
  to?: string
  icon: ComponentType<{ className?: string }>
  /** Match the path exactly (for index routes). */
  end?: boolean
  /** Sub-items rendered (indented) when the group is expanded. */
  children?: NavItem[]
  /** Org-Admin-only — hidden entirely from regular Buyer / Supplier users (the Organisation group). */
  adminOnly?: boolean
  /**
   * Gated on the org's KYB status: shown but non-interactive until the admin has verified the
   * organisation. Dashboard and RFQs stay reachable while under review — an unverified org can
   * still build drafts — but everything downstream of a published RFQ needs a verified account.
   */
  requiresVerification?: boolean
}

export interface PortalConfig {
  id: Portal
  label: string
  basePath: string
  nav: NavItem[]
}

// `label` fields hold i18n keys, resolved with t() in the shell.
export const BUYER_PORTAL: PortalConfig = {
  id: 'buyer',
  label: 'portals.buyer',
  basePath: '/buyer',
  nav: [
    { label: 'nav.dashboard', to: '/buyer', icon: GridIcon, end: true },
    { label: 'nav.rfqs', to: '/buyer/rfqs', icon: FileIcon },
    { label: 'nav.bids', to: '/buyer/bids', icon: ScaleIcon, requiresVerification: true },
    { label: 'nav.negotiations', to: '/buyer/negotiations', icon: ChatIcon, requiresVerification: true },
    { label: 'nav.orders', to: '/buyer/orders', icon: BoxIcon, requiresVerification: true },
    {
      label: 'nav.organisation',
      icon: BankIcon,
      adminOnly: true,
      children: [
        { label: 'nav.overview', to: '/buyer/organisation', icon: GridIcon, end: true },
        { label: 'nav.users', to: '/buyer/organisation/users', icon: UsersIcon },
        { label: 'nav.orgProfile', to: '/buyer/organisation/profile', icon: BankIcon },
        { label: 'nav.settings', to: '/buyer/organisation/settings', icon: SettingsIcon },
      ],
    },
  ],
}

export const SUPPLIER_PORTAL: PortalConfig = {
  id: 'supplier',
  label: 'portals.supplier',
  basePath: '/supplier',
  nav: [
    { label: 'nav.dashboard', to: '/supplier', icon: GridIcon, end: true },
    // The sidebar reads RFQs / Bids on both sides; the pages keep their longer titles.
    { label: 'nav.rfqs', to: '/supplier/rfqs', icon: FileIcon },
    { label: 'nav.bids', to: '/supplier/bids', icon: ScaleIcon, requiresVerification: true },
    { label: 'nav.negotiations', to: '/supplier/negotiations', icon: ChatIcon, requiresVerification: true },
    { label: 'nav.orders', to: '/supplier/orders', icon: BoxIcon, requiresVerification: true },
    {
      label: 'nav.organisation',
      icon: BankIcon,
      adminOnly: true,
      children: [
        { label: 'nav.overview', to: '/supplier/organisation', icon: GridIcon, end: true },
        { label: 'nav.users', to: '/supplier/organisation/users', icon: UsersIcon },
        { label: 'nav.orgProfile', to: '/supplier/organisation/profile', icon: BankIcon },
        { label: 'nav.settings', to: '/supplier/organisation/settings', icon: SettingsIcon },
      ],
    },
  ],
}
