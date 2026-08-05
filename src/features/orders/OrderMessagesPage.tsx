import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { cn } from '@/shared/lib/cn'
import { useAppendOrderMessage, useOrder } from './hooks/orderQueries'

const addMinutes = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()

/** The order's supplier conversation — identities revealed, terms locked. Sourced from the order. */
export function OrderMessagesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const append = useAppendOrderMessage()
  const [draft, setDraft] = useState('')

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!order) return <Navigate to="/buyer/orders" replace />

  const supplier = order.supplierShort
  const stamp = (iso: string) => {
    const d = new Date(iso)
    const day = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(d)
    const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return `${day} · ${time}`
  }

  // A seeded dispatch exchange (shown when the order has shipped), then the buyer's own messages.
  const seeded = order.shipment.dispatchedAt
    ? [
        { by: 'supplier' as const, author: supplier, text: t('order.messages.seedDispatch', { ref: order.shipment.reference ?? '—' }), at: order.shipment.dispatchedAt },
        { by: 'buyer' as const, author: t('order.messages.you'), text: t('order.messages.seedAck'), at: addMinutes(order.shipment.dispatchedAt, 55) },
      ]
    : []
  const stored = (order.messages ?? []).map((m) => ({ by: m.by, author: m.by === 'buyer' ? t('order.messages.you') : supplier, text: m.text, at: m.at }))
  const messages = [...seeded, ...stored]

  const send = () => {
    const body = draft.trim()
    if (!body) return
    append.mutate(
      { id: order.id, message: { by: 'buyer', text: body, at: new Date().toISOString() } },
      { onSuccess: () => setDraft('') },
    )
  }

  return (
    <section className="mx-auto w-full max-w-4xl motion-safe:animate-card-in">
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/orders')} className="cursor-pointer hover:text-content-secondary">{t('order.title')}</button>
        <span className="mx-1.5">/</span>
        <button type="button" onClick={() => navigate(`/buyer/orders/${order.id}`)} className="cursor-pointer hover:text-content-secondary">{order.id}</button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{t('order.messages.crumb')}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-content-primary">{t('order.messages.heading')}</h1>
      <p className="mt-1 text-sm text-content-secondary">{order.title} · {order.id} · {order.supplier.name}</p>

      <div className="mt-5 rounded-xl border border-border-subtle bg-bg-surface p-5">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-content-tertiary">{t('order.messages.empty')}</p>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={`${m.at}:${i}`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={cn('font-semibold', m.by === 'buyer' ? 'text-content-primary' : 'text-content-link')}>{m.author}</span>
                  <span className="text-xs text-content-tertiary">{stamp(m.at)}</span>
                </div>
                <p className="mt-1 text-sm text-content-secondary">{m.text}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 border-t border-border-subtle pt-5">
          <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('order.messages.placeholder')} />
          <div className="mt-3">
            <Button onClick={send} isLoading={append.isPending}>{t('order.messages.send')}</Button>
          </div>
          <p className="mt-3 text-xs text-content-tertiary">{t('order.messages.locked')}</p>
        </div>
      </div>
    </section>
  )
}
