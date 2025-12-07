type Listener<T> = (state: T) => void;

export interface Store<T> {
  getState(): T;
  setState(partial: Partial<T>): void;
  subscribe(listener: Listener<T>): () => void;
  reset(): void;
}

export function createStore<T extends object>(initialState: T): Store<T> {
  let state = { ...initialState };
  const listeners = new Set<Listener<T>>();

  return {
    getState(): T {
      return state;
    },

    setState(partial: Partial<T>): void {
      state = { ...state, ...partial };
      listeners.forEach((listener) => listener(state));
    },

    subscribe(listener: Listener<T>): () => void {
      listeners.add(listener);
      // Call immediately with current state
      listener(state);
      return () => listeners.delete(listener);
    },

    reset(): void {
      state = { ...initialState };
      listeners.forEach((listener) => listener(state));
    },
  };
}
