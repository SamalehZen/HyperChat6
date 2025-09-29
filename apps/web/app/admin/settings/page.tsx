"use client";
import { useEffect, useMemo, useState } from 'react';
import { Button, Flex } from '@repo/ui';
import { ApiKeySettings, CreditsSettings, PersonalizationSettings } from '@repo/common/components/settings-modal';

const SECTIONS = [
  { key: 'personalization', label: 'Personnalisation', hash: 'personalisation' },
  { key: 'usage', label: 'Utilisation', hash: 'utilisation' },
  { key: 'api', label: 'Clés API', hash: 'cles-api' },
] as const;

export default function AdminSettingsPage() {
  const [active, setActive] = useState<(typeof SECTIONS)[number]['key']>('personalization');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = window.location.hash?.replace('#', '');
    const byHash = SECTIONS.find(s => s.hash === h);
    if (byHash) setActive(byHash.key);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = SECTIONS.find(s => s.key === active)?.hash;
    if (!hash) return;
    if (window.location.hash !== `#${hash}`) {
      history.replaceState(null, '', `#${hash}`);
    }
  }, [active]);

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Réglages Admin</h1>

      <div className="flex gap-6">
        <nav className="w-56 shrink-0">
          <div className="sticky top-6 flex flex-col gap-2">
            {SECTIONS.map((s) => (
              <Button
                key={s.key}
                variant={active === s.key ? 'secondary' : 'ghost'}
                className="justify-start"
                onClick={() => {
                  setActive(s.key);
                  const el = document.getElementById(`section-${s.hash}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                rounded="lg"
              >
                {s.label}
              </Button>
            ))}
          </div>
        </nav>

        <div className="flex-1">
          <div id="section-personalisation" className={active === 'personalization' ? 'block scroll-mt-20' : 'hidden scroll-mt-20'}>
            <SectionCard title="Personnalisation">
              <PersonalizationSettings />
            </SectionCard>
          </div>
          <div id="section-utilisation" className={active === 'usage' ? 'block scroll-mt-20' : 'hidden scroll-mt-20'}>
            <SectionCard title="Utilisation">
              <CreditsSettings />
            </SectionCard>
          </div>
          <div id="section-cles-api" className={active === 'api' ? 'block scroll-mt-20' : 'hidden scroll-mt-20'}>
            <SectionCard title="Clés API (BYOK)">
              <ApiKeySettings />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="[&>*]:max-w-full">
        {children}
      </div>
    </div>
  );
}
