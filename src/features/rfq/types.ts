export type RfqStatus = 'draft' | 'open' | 'awarded' | 'closed'

export interface Rfq {
  id: string
  title: string
  status: RfqStatus
  createdAt: string
}

export interface CreateRfqInput {
  title: string
}
