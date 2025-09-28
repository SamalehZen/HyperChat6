import { create } from 'zustand';

export type AllowedChatModesState = {
  allowedChatModes: string[] | null;
  setAllowedChatModes: (modes: string[] | null) => void;
  isModeAllowed: (mode: string) => boolean;
};

export const useAllowedChatModesStore = create<AllowedChatModesState>((set, get) => ({
  allowedChatModes: null,
  setAllowedChatModes: (modes) => set({ allowedChatModes: modes }),
  isModeAllowed: (mode: string) => {
    const allowed = get().allowedChatModes;
    if (!allowed || allowed === null) return true;
    return allowed.includes(mode);
  },
}));