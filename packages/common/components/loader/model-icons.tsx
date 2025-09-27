import React from 'react';
import { Bot } from 'lucide-react';
import { ChatMode } from '@repo/shared/config';
import { ModelIcons } from '@repo/ui';
import { IconPencil } from '../icons';
import { IconAtom, IconNorthStar, IconTable, IconFile, IconFileSpreadsheet } from '@tabler/icons-react';

export function getModelIconByChatMode(mode: ChatMode): React.ReactNode {
  switch (mode) {
    case ChatMode.CORRECTION:
      return <IconPencil size={16} strokeWidth={2} className="text-white" />;
    case ChatMode.CLASSIFICATION:
      return <IconTable size={16} strokeWidth={2} className="text-white" />;
    case ChatMode.NOMENCLATURE_DOUANIERE:
      return <IconFile size={16} strokeWidth={2} className="text-white" />;
    case ChatMode.SMART_PDF_TO_EXCEL:
      return <IconFileSpreadsheet size={16} strokeWidth={2} className="text-white" />;

    case ChatMode.Deep:
      return <IconAtom size={16} strokeWidth={2} className="text-white" />;
    case ChatMode.Pro:
      return <IconNorthStar size={16} strokeWidth={2} className="text-white" />;

    case ChatMode.GEMINI_2_5_FLASH:
    case ChatMode.GEMINI_2_5_PRO:
      return ModelIcons.GEMINI;

    case ChatMode.GPT_4_1:
    case ChatMode.GPT_4_1_Mini:
    case ChatMode.GPT_4_1_Nano:
    case ChatMode.GPT_4o_Mini:
    case ChatMode.O4_Mini:
      return ModelIcons.OPENAI;

    case ChatMode.CLAUDE_3_5_SONNET:
    case ChatMode.CLAUDE_3_7_SONNET:
      return ModelIcons.ANTHROPIC;

    case ChatMode.LLAMA_4_SCOUT:
      return ModelIcons.META;

    case ChatMode.DEEPSEEK_R1:
      return ModelIcons.DEEPSEEK;

    default:
      return <Bot className="w-4 h-4" />;
  }
}

export function getModelThemeByChatMode(mode: ChatMode): { icon: React.ReactNode; gradientClass: string; iconBgClass: string } {
  switch (mode) {
    case ChatMode.CORRECTION:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-emerald-500 via-teal-500 to-cyan-500',
        iconBgClass: 'bg-emerald-600 dark:bg-emerald-500',
      };
    case ChatMode.CLASSIFICATION:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-indigo-500 via-violet-500 to-sky-500',
        iconBgClass: 'bg-indigo-600 dark:bg-indigo-500',
      };
    case ChatMode.NOMENCLATURE_DOUANIERE:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-amber-500 via-yellow-500 to-lime-500',
        iconBgClass: 'bg-amber-600 dark:bg-amber-500',
      };
    case ChatMode.SMART_PDF_TO_EXCEL:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-green-600 via-emerald-500 to-lime-400',
        iconBgClass: 'bg-emerald-600 dark:bg-emerald-500',
      };
    case ChatMode.GEMINI_2_5_FLASH:
    case ChatMode.GEMINI_2_5_PRO:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-sky-500 via-blue-500 to-indigo-500',
        iconBgClass: 'bg-sky-600 dark:bg-sky-500',
      };
    case ChatMode.Deep:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-fuchsia-500 via-violet-500 to-rose-500',
        iconBgClass: 'bg-fuchsia-600 dark:bg-fuchsia-500',
      };
    case ChatMode.Pro:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-cyan-500 via-blue-600 to-indigo-600',
        iconBgClass: 'bg-blue-600 dark:bg-blue-500',
      };
    default:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-neutral-400 via-neutral-500 to-neutral-600',
        iconBgClass: 'bg-neutral-700 dark:bg-neutral-600',
      };
  }
}

export default getModelIconByChatMode;
