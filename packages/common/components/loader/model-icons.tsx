import React from 'react';
import { Bot } from 'lucide-react';
import { ChatMode } from '@repo/shared/config';
import { ModelIcons } from '@repo/ui';
import { IconPencil } from '../icons';
import { IconAtom, IconNorthStar, IconTable, IconFile, IconFileSpreadsheet } from '@tabler/icons-react';

export function getModelIconByChatMode(mode: ChatMode): React.ReactNode {
  switch (mode) {
    case ChatMode.CORRECTION:
      return <IconPencil size={16} strokeWidth={2} className="text-emerald-600 dark:text-emerald-400" />;
    case ChatMode.CLASSIFICATION:
      return <IconTable size={16} strokeWidth={2} className="text-indigo-600 dark:text-indigo-400" />;
    case ChatMode.NOMENCLATURE_DOUANIERE:
      return <IconFile size={16} strokeWidth={2} className="text-amber-600 dark:text-amber-400" />;
    case ChatMode.SMART_PDF_TO_EXCEL:
      return <IconFileSpreadsheet size={16} strokeWidth={2} className="text-black dark:text-white" />;

    case ChatMode.Deep:
      return <IconAtom size={16} strokeWidth={2} className="text-fuchsia-600 dark:text-fuchsia-400" />;
    case ChatMode.Pro:
      return <IconNorthStar size={16} strokeWidth={2} className="text-blue-600 dark:text-blue-400" />;

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
      return <Bot className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />;
  }
}

export function getModelThemeByChatMode(mode: ChatMode): { icon: React.ReactNode; gradientClass: string; iconBgClass: string } {
  switch (mode) {
    case ChatMode.CORRECTION:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-emerald-500 via-teal-500 to-cyan-500',
        iconBgClass: 'bg-emerald-50 dark:bg-emerald-950',
      };
    case ChatMode.CLASSIFICATION:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-indigo-500 via-violet-500 to-sky-500',
        iconBgClass: 'bg-indigo-50 dark:bg-indigo-950',
      };
    case ChatMode.NOMENCLATURE_DOUANIERE:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-amber-500 via-yellow-500 to-lime-500',
        iconBgClass: 'bg-amber-50 dark:bg-amber-950',
      };
    case ChatMode.SMART_PDF_TO_EXCEL:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'bg-[linear-gradient(to_right,_#4D4D4D,_#8C8C8C,_#B0B0B0,_#D9D9D9,_#F2F2F2)]',
        iconBgClass: 'bg-[#F2F2F2] dark:bg-neutral-950',
      };
    case ChatMode.GEMINI_2_5_FLASH:
    case ChatMode.GEMINI_2_5_PRO:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-sky-500 via-blue-500 to-indigo-500',
        iconBgClass: 'bg-sky-50 dark:bg-sky-950',
      };
    case ChatMode.GPT_4_1:
    case ChatMode.GPT_4_1_Mini:
    case ChatMode.GPT_4_1_Nano:
    case ChatMode.GPT_4o_Mini:
    case ChatMode.O4_Mini:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-neutral-400 via-neutral-500 to-neutral-600',
        iconBgClass: 'bg-neutral-50 dark:bg-neutral-950',
      };
    case ChatMode.CLAUDE_3_5_SONNET:
    case ChatMode.CLAUDE_3_7_SONNET:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-neutral-400 via-neutral-500 to-neutral-600',
        iconBgClass: 'bg-neutral-50 dark:bg-neutral-950',
      };
    case ChatMode.LLAMA_4_SCOUT:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-neutral-400 via-neutral-500 to-neutral-600',
        iconBgClass: 'bg-purple-50 dark:bg-purple-950',
      };
    case ChatMode.DEEPSEEK_R1:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-neutral-400 via-neutral-500 to-neutral-600',
        iconBgClass: 'bg-rose-50 dark:bg-rose-950',
      };
    case ChatMode.Deep:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-fuchsia-500 via-violet-500 to-rose-500',
        iconBgClass: 'bg-fuchsia-50 dark:bg-fuchsia-950',
      };
    case ChatMode.Pro:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-cyan-500 via-blue-600 to-indigo-600',
        iconBgClass: 'bg-blue-50 dark:bg-blue-950',
      };
    default:
      return {
        icon: getModelIconByChatMode(mode),
        gradientClass: 'from-neutral-400 via-neutral-500 to-neutral-600',
        iconBgClass: 'bg-neutral-50 dark:bg-neutral-950',
      };
  }
}

export default getModelIconByChatMode;
