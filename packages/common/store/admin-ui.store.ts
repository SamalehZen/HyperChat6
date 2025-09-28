"use client";
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type State = {
  isAdminSidebarOpen: boolean;
};

type Actions = {
  setIsAdminSidebarOpen: (updater: (prev: boolean) => boolean) => void;
};

const PERSIST_KEY = 'admin.dashboard.sidebar.open';

export const useAdminUIStore = create(
  immer<State & Actions>((set, get) => ({
    isAdminSidebarOpen:
      typeof window !== 'undefined'
        ? (() => {
            try {
              const v = window.localStorage.getItem(PERSIST_KEY);
              return v ? JSON.parse(v) : true;
            } catch {
              return true;
            }
          })()
        : true,
    setIsAdminSidebarOpen: (updater: (prev: boolean) => boolean) =>
      set(state => {
        const next = updater(state.isAdminSidebarOpen);
        try {
          if (typeof window !== 'undefined')
            window.localStorage.setItem(PERSIST_KEY, JSON.stringify(next));
        } catch {}
        return { isAdminSidebarOpen: next };
      }),
  }))
);
