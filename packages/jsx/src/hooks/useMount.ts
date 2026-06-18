import { useEffect } from '../hooks.js';

export function useMount(callback: () => void): void {
  useEffect(() => {
    callback();
  }, []);
}
