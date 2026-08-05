import type { ComponentType } from 'react'
import type { Portal } from '@/platform/auth'
import { GridIcon, FileIcon, ScaleIcon, ChatIcon, BoxIcon } from '@/shared/ui/dashboard'

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
    { label: 'nav.dashboard', to: '/buyer', icon: GridIcon, end: true },
    { label: 'nav.rfqs', to: '/buyer/rfqs', icon: FileIcon },
    { label: 'nav.bids', to: '/buyer/bids', icon: ScaleIcon },
    { label: 'nav.negotiations', to: '/buyer/negotiations', icon: ChatIcon },
    { label: 'nav.orders', to: '/buyer/orders', icon: BoxIcon },
  ],
}

export const SUPPLIER_PORTAL: PortalConfig = {
  id: 'supplier',
  label: 'portals.supplier',
  basePath: '/supplier',
  nav: [
    { label: 'nav.dashboard', to: '/supplier', icon: GridIcon, end: true },
    { label: 'nav.availableRfqs', to: '/supplier/rfqs', icon: FileIcon },
    { label: 'nav.myBids', to: '/supplier/bids', icon: ScaleIcon },
    { label: 'nav.negotiations', to: '/supplier/negotiations', icon: ChatIcon },
    { label: 'nav.orders', to: '/supplier/orders', icon: BoxIcon },
  ],
}
