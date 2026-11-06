import { seed } from './repository';
import type { State } from './types';

const key = 'p5-assurance-workspace-v1';
let fallback: State | undefined;
let writeFailed = false;

export const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const workspace = {
  read(): State {
    if (writeFailed && fallback) return fallback;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch {
      return fallback ?? seed();
    }
    return fallback ?? seed();
  },
  write(state: State) {
    fallback = state;
    try {
      localStorage.setItem(key, JSON.stringify(state));
      writeFailed = false;
    } catch {
      writeFailed = true;
    }
  },
  key,
};
