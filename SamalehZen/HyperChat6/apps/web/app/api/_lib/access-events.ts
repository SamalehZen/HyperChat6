import { EventEmitter } from 'events';

let accessEmitter: EventEmitter | null = null;

export function getAccessEmitter() {
  if (!accessEmitter) {
    accessEmitter = new EventEmitter();
    accessEmitter.setMaxListeners(1000);
  }
  return accessEmitter;
}