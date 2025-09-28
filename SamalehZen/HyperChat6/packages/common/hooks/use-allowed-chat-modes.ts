import { useEffect } from 'react';
import { useAllowedChatModesStore } from '@repo/common/store';

export function useAllowedChatModes() {
  const allowedChatModes = useAllowedChatModesStore(s => s.allowedChatModes);
  const isModeAllowed = useAllowedChatModesStore(s => s.isModeAllowed);
  return { allowedChatModes, isModeAllowed };
}