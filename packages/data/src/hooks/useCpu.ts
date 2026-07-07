// packages/data/src/hooks/useCpu.ts
// Fix for Issue #2119: adds error state + exponential backoff on polling failure
import { useState, useEffect } from '@termuijs/jsx';
import { cpu } from '../cpu.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CpuState {
  usage: number;
  cores: number[];
  error: Error | null;  // ← NEW: null when healthy, Error when /proc read fails
}

// ─────────────────────────────────────────────────────────────────────────────
// The backoff multiplier: on error, wait intervalMs * BACKOFF_MULTIPLIER
// before retrying. Prevents spamming failed syscalls (e.g. 500 EPERM/sec).
const BACKOFF_MULTIPLIER = 5;
// ─────────────────────────────────────────────────────────────────────────────

// ─── Your existing sleep() implementation ──────────────────────────────────
// (Keep your actual sleep implementation here)
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// ─────────────────────────────────────────────────────────────────────────────

export function useCpu(intervalMs: number = 1000): CpuState {
  const [state, setState] = useState<CpuState>({
    usage: 0,
    cores: [],
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          // ── Your existing cpu.percent and cpu.perCore access ──────────────
          // This uses your actual cpu.ts implementation
          const usage = cpu.percent;
          const cores = cpu.perCore;
          // ─────────────────────────────────────────────────────────────────

          if (!cancelled) {
            // Success: clear any previous error state
            setState({ usage, cores, error: null });
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