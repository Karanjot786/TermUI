import { useEffect } from '../hooks';

export function useMount(callback: () => void): void {
  useEffect(() => {
    callback();
  }, []);
}
