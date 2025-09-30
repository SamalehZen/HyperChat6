"use client";
import { useSearchParams } from 'next/navigation';
import { UserMetricsDetails } from '../../../_components/user-metrics-details';

export default function AdminUserMetricsPage({ params }: { params: { id: string } }) {
  const sp = useSearchParams();
  const windowParam = (sp.get('window') as '24h'|'7j'|'30j'|null) || '7j';
  return <UserMetricsDetails userId={params.id} initialWindow={windowParam} />;
}
