import { createContext, useContext } from 'react';
import type { State } from './domain/types';

export type Mutation<T> = (state: State, now: string) => { state: State; value: T };
export type Toast = { message: string; tone: 'success' | 'error' };
interface Store {
  state: State;
  perform: <T>(mutation: Mutation<T>, message?: string, delay?: number) => Promise<T>;
  notify: (message: string, tone?: Toast['tone']) => void;
  toast: Toast | null;
  dismiss: () => void;
}

export const Context = createContext<Store | null>(null);

export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error('Workspace provider is missing.');
  return context;
}
