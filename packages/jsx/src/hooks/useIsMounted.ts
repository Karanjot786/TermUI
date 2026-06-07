import { useEffect, useRef, useCallback } from '../hooks.js';

export function useIsMounted(): () => boolean {
  // 1. Hold the mounted state safely in a ref to prevent accidental re-renders
  const isMountedRef = useRef(false);

  useEffect(() => {
    // 2. Set to true immediately after the mount effect runs
    isMountedRef.current = true;
    
    // 3. Cleanup function clears the flag back to false when unmounted
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 4. Return a stable getter function that always references the current ref value
  return useCallback(() => isMountedRef.current, []);
}
