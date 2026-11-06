import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { advanceRun } from './domain/repository';
import { testCase } from './domain/policy';
import { wait, workspace } from './domain/service';
import type { State } from './domain/types';
import { Context } from './state';
import type { Mutation, Toast } from './state';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(workspace.read);
  const [toast, setToast] = useState<Toast | null>(null);
  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => setToast({ message, tone }), []);
  const dismiss = useCallback(() => setToast(null), []);
  const commit = useCallback((next: State) => {
    workspace.write(next);
    setState(next);
  }, []);

  const resetVersion = state.resetVersion ?? 0;
  const perform = useCallback(async <T,>(mutation: Mutation<T>, message?: string, delay = 320) => {
    await wait(delay);
    const update = () => {
      const current = workspace.read();
      if ((current.resetVersion ?? 0) !== resetVersion) {
        throw new Error('The demo was reset before this action completed.');
      }
      const result = mutation(current, new Date().toISOString());
      commit(result.state);
      return result.value;
    };
    try {
      const value = navigator.locks ? await navigator.locks.request(workspace.key, update) : update();
      if (message) notify(message);
      return value;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The simulation could not complete this action.', 'error');
      throw error;
    }
  }, [commit, notify, resetVersion]);

  const running = state.assessments.some((item) => item.status === 'running');
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const current = workspace.read();
      const now = Date.now();
      const ready = current.assessments.filter((item) => item.status === 'running' && now - Date.parse(item.stepStartedAt) >= testCase(item.queue[item.cursor]).duration);
      if (!ready.length) return;
      commit(ready.reduce((next, item) => advanceRun(next, item.id, new Date(now).toISOString()), current));
    };
    const timer = window.setInterval(() => {
      if (navigator.locks) void navigator.locks.request(workspace.key, { ifAvailable: true }, (lock) => { if (lock) tick(); });
      else tick();
    }, 100);
    return () => window.clearInterval(timer);
  }, [commit, running]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (event.key === workspace.key) setState(workspace.read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismiss, 3800);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast]);

  return <Context.Provider value={{ state, perform, toast, notify, dismiss }}>{children}</Context.Provider>;
}
