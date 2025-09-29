"use client";
import { useSearchParams } from 'next/navigation';
import { ProviderHealthDetails } from '../../_components/provider-health-details';

export default function ProviderHealthPage({ params }: { params: { provider: string } }) {
  const sp = useSearchParams();
  const windowParam = (sp.get('window') as '24h'|'7j'|'30j'|null) || '7j';
  return <ProviderHealthDetails providerKey={params.provider} initialWindow={windowParam} />;
}
