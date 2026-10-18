// Each mounted busy control owns one token, so overlapping actions cannot
// dismiss the indicator while another action is still processing.
export function createScreenLoadingStore() {
  const active = new Set<symbol>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  return {
    getSnapshot: () => active.size > 0,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    start() {
      const token = Symbol();
      active.add(token);
      notify();
      return () => {
        if (active.delete(token)) notify();
      };
    },
  };
}

export const screenLoading = createScreenLoadingStore();