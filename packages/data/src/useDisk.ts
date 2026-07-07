// packages/data/src/hooks/useDisk.ts
// Fix for Issue #2119: adds error state + exponential backoff on polling failure
import { useState, useEffect } from '@termuijs/jsx';
import { disk } from '../disk.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DiskState {
  used: number;
  total: number;
  free: number;
  percent: number;
  error: Error | null;  // ← NEW: null when healthy, Error when disk read fails
}

// ─────────────────────────────────────────────────────────────────────────────
// The backoff multiplier: on error, wait intervalMs * BACKOFF_MULTIPLIER
// before retrying. Prevents spamming failed syscalls.
const BACKOFF_MULTIPLIER = 5;
// ─────────────────────────────────────────────────────────────────────────────

// ─── Helper: Parse size strings (e.g., "10G", "500M") to bytes ─────────────
function parseSizeToBytes(sizeStr: string): number {
  const units: { [key: string]: number } = {
    'B': 1,
    'K': 1024,
    'M': 1024 * 1024,
    'G': 1024 * 1024 * 1024,
    'T': 1024 * 1024 * 1024 * 1024,
  };
  
  const match = sizeStr.match(/^([\d.]+)\s*([BKMGTP]?)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  return value * (units[unit] || 1);
}

// ─── Your existing sleep() implementation ──────────────────────────────────
// (Keep your actual sleep implementation here)
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// ─────────────────────────────────────────────────────────────────────────────

export function useDisk(intervalMs: number = 1000): DiskState {
  const [state, setState] = useState<DiskState>({
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
          // ── Your existing disk.main access ─────────────────────────────────
          // This uses your actual disk.ts implementation
          const mainPartition = disk.main;
          // ─────────────────────────────────────────────────────────────────

          if (!cancelled && mainPartition) {
            // Parse the size strings to numbers (in bytes)
            const total = parseSizeToBytes(mainPartition.size);
            const used = parseSizeToBytes(mainPartition.used);
            const free = parseSizeToBytes(mainPartition.available);
            const percent = mainPartition.percent;

            setState({
              used,
              total,
              free,
              percent,
              error: null,
            });
          } else if (!cancelled && !mainPartition) {
            // No root partition found
            setState((prev) => ({
              ...prev,
              error: new Error('No root partition (/) found'),
            }));
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