"use client";
import { useAiSettingsStore, useChatStore } from '@repo/common/store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge } from '@repo/ui';
import { useMemo, useState } from 'react';

export const ThoughtPanel = ({ threadItemId }: { threadItemId: string }) => {
  const reasoning = useChatStore(s => s.getRuntimeReasoning(threadItemId));
  const enabledDefault = useAiSettingsStore(s => s.reasoningEnabledDefault);
  const [open, setOpen] = useState<string | undefined>(enabledDefault ? 'thought' : undefined);

  if (!reasoning) return null;

  return (
    <div className="mt-2">
      <Accordion type="single" collapsible value={open} onValueChange={(v) => setOpen(v as any)}>
        <AccordionItem value="thought">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <span>Pensée</span>
              <Badge variant="secondary" className="rounded-full text-[10px]">live</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
              {reasoning}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
