import React from 'react';
import { Bot } from 'lucide-react';
import { ChatMode } from '@repo/shared/config';
import { ModelIcons } from '@repo/ui';

export function getModelIconByChatMode(mode: ChatMode): React.ReactNode {
  switch (mode) {
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

export default getModelIconByChatMode;
