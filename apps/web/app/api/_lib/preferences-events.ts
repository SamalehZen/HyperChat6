import { EventEmitter } from 'events';

export type UIPreferencesEvent = {
  backgroundVariant: string;
  aiPromptShinePreset: string;
  allowedChatModes?: string[];
  updatedAt: string;
};

let emitter: EventEmitter | null = null;
let latest: UIPreferencesEvent | null = null;

export function getPreferencesEmitter() {
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(1000);
  }
  return emitter;
}

export function getLatestPreferencesEvent() {
  return latest;
}

export function setLatestPreferencesEvent(evt: UIPreferencesEvent) {
  latest = evt;
  getPreferencesEmitter().emit('update', evt);
}
