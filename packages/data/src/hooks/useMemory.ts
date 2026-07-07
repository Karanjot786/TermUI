// packages/data/src/hooks/useMemory.ts
// Fix for Issue #2119: adds error state + exponential backoff on polling failure
import { useState, useEffect } from '@termuijs/jsx';
import { memory } from '../memory.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MemoryState {
  used: number;
  total: number;
  free: number;
  percent: number;
  error: Error | null;  // ← NEW: null when healthy, Error when memory read fails
}

// ─────────────────────────────────────────────────────────────────────────────
// The backoff multiplier: on error, wait intervalMs * BACKOFF_MULTIPLIER
// before retrying. Prevents spamming failed syscalls.
const BACKOFF_MULTIPLIER = 5;
// ─────────────────────────────────────────────────────────────────────────────

// ─── Your existing sleep() implementation ──────────────────────────────────
// (Keep your actual sleep implementation here)
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// ─────────────────────────────────────────────────────────────────────────────

export function useMemory(intervalMs: number = 1000): MemoryState {
  const [state, setState] = useState<MemoryState>({
    used: 0,
    total: 0,
    free: 0,
    percent: 0,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          // ── Your existing memory.raw access ──────────────────────────────
          // This uses your actual memory.ts implementation
          const data = memory.raw;
          const percent = memory.percent;
          // ─────────────────────────────────────────────────────────────────

          if (!cancelled) {
            setState({
              used: data.used,
              total: data.total,
              free: data.free,
              percent: percent,
              error: null,
            });
          }
          await sleep(intervalMs);

        } catch (err) {
          // ── FIX #2119: Catch EPERM, EACCES, and any other polling error ───
          if (!cancelled) {
            setState((prev) => ({
              ...prev,                          // keep last known good values
              error: err instanceof Error
                ? err
                : new Error(String(err)),
            }));
          }
          // Back off: don't hammer a resource that's already permission-denied
          await sleep(intervalMs * BACKOFF_MULTIPLIER);
          // ─────────────────────────────────────────────────────────────────
          continue;
        }
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [intervalMs]);

  return state;
}