import { useTranslation } from 'react-i18next'
import { PagePlaceholder } from '@/shared/ui/PagePlaceholder'

export function SettlementPage() {
  const { t } = useTranslation()
  return <PagePlaceholder title={t('settlement.title')} description={t('settlement.subtitle')} />
}
