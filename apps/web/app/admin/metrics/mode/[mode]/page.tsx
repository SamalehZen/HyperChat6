"use client";
import { useSearchParams } from 'next/navigation';
import { ModeDetails } from '../../../_components/mode-details';

export default function ModePage({ params }: { params: { mode: string } }) {
  const sp = useSearchParams();
  const windowParam = (sp.get('window') as '24h'|'7j'|'30j'|null) || '7j';
  return <ModeDetails modeKey={params.mode} initialWindow={windowParam} />;
}
