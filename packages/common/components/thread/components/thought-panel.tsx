"use client";
import { useAiSettingsStore, useChatStore } from '@repo/common/store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge } from '@repo/ui';
import { useMemo, useState } from 'react';

export const ThoughtPanel = ({ threadItemId }: { threadItemId: string }) => {
  const reasoning = useChatStore(s => s.getRuntimeReasoning(threadItemId));
  const enabledDefault = useAiSettingsStore(s => s.reasoningEnabledDefault);
  const threadId = useChatStore(s => s.currentThreadId);
  const enabledOverrides = useChatStore(s => s.reasoningEnabledOverrides);
  const overrideEnabled = threadId ? enabledOverrides?.[threadId] : undefined;
  const enabled = (overrideEnabled !== undefined ? overrideEnabled : enabledDefault) ?? true;
  const [open, setOpen] = useState<string | undefined>(enabled ? 'thought' : undefined);

  if (!enabled) return null;

  return (
    <div className="mt-2">
      <Accordion type="single" collapsible value={open} onValueChange={(v) => setOpen(v as any)}>
        <AccordionItem value="thought">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span>Pensée</span>
              <Badge variant="secondary" className="rounded-full text-[10px]">{reasoning ? 'live' : 'actif'}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
              {reasoning && reasoning.length > 0 ? reasoning : "En attente de pensée…"}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
