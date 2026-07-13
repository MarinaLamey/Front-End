import { Outlet } from 'react-router-dom'
import { SiteHeader } from '@/app/components/SiteHeader'

/** Shell for unauthenticated pages (login, register): shared header + centered content. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-canvas">
      <SiteHeader showLinks={false} />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Outlet />
      </main>
    </div>
  )
}
