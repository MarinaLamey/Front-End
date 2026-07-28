import type { ComponentType } from 'react'
import type { Portal } from '@/platform/auth'
import {
  GridIcon,
  FileIcon,
  ChecklistIcon,
  ChatIcon,
  BoxIcon,
  UsersIcon,
  DocCheckIcon,
  ChartIcon,
} from '@/shared/ui/dashboard'

export interface NavItem {
  /** i18n key, resolved with t() in the shell. */
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
  /** Match the path exactly (for index routes). */
  end?: boolean
  /** Show a chevron affordance (group with future sub-items). */
  expandable?: boolean
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
    { label: 'nav.buyerDashboard', to: '/buyer', icon: GridIcon, end: true },
    { label: 'nav.rfqs', to: '/buyer/rfqs', icon: FileIcon },
    { label: 'nav.bids', to: '/buyer/bids', icon: ChecklistIcon },
    { label: 'nav.negotiations', to: '/buyer/negotiations', icon: ChatIcon },
    { label: 'nav.orders', to: '/buyer/orders', icon: BoxIcon, expandable: true },
    { label: 'nav.suppliers', to: '/buyer/suppliers', icon: UsersIcon, expandable: true },
    { label: 'nav.documents', to: '/buyer/documents', icon: DocCheckIcon },
    { label: 'nav.analytics', to: '/buyer/analytics', icon: ChartIcon },
    { label: 'nav.subscription', to: '/buyer/subscription', icon: GridIcon },
  ],
}

export const SUPPLIER_PORTAL: PortalConfig = {
  id: 'supplier',
  label: 'portals.supplier',
  basePath: '/supplier',
  nav: [
    { label: 'nav.supplierDashboard', to: '/supplier', icon: GridIcon, end: true },
    { label: 'nav.availableRfqs', to: '/supplier/rfqs', icon: FileIcon },
    { label: 'nav.myBids', to: '/supplier/bids', icon: ChecklistIcon },
    { label: 'nav.negotiations', to: '/supplier/negotiations', icon: ChatIcon },
    { label: 'nav.orders', to: '/supplier/orders', icon: BoxIcon, expandable: true },
    { label: 'nav.buyers', to: '/supplier/buyers', icon: UsersIcon, expandable: true },
    { label: 'nav.documents', to: '/supplier/documents', icon: DocCheckIcon },
    { label: 'nav.analytics', to: '/supplier/analytics', icon: ChartIcon },
    { label: 'nav.subscription', to: '/supplier/subscription', icon: GridIcon },
  ],
}
