"use client";
import { useState } from 'react';
import { Button, Flex } from '@repo/ui';
import { ApiKeySettings, CreditsSettings, PersonalizationSettings } from '@repo/common/components/settings-modal';

const SECTIONS = [
  { key: 'personalization', label: 'Personnalisation' },
  { key: 'usage', label: 'Utilisation' },
  { key: 'api', label: 'Clés API' },
] as const;

export default function AdminSettingsPage() {
  const [active, setActive] = useState<(typeof SECTIONS)[number]['key']>('personalization');

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
                onClick={() => setActive(s.key)}
                rounded="lg"
              >
                {s.label}
              </Button>
            ))}
          </div>
        </nav>

        <div className="flex-1">
          <div className={active === 'personalization' ? 'block' : 'hidden'}>
            <SectionCard title="Personnalisation">
              <PersonalizationSettings />
            </SectionCard>
          </div>
          <div className={active === 'usage' ? 'block' : 'hidden'}>
            <SectionCard title="Utilisation">
              <CreditsSettings />
            </SectionCard>
          </div>
          <div className={active === 'api' ? 'block' : 'hidden'}>
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
