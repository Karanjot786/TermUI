// ─────────────────────────────────────────────────────
// @termuijs/store — Devtools Logger Middleware
//
// Provides two exports:
//
//   logger        — drop-in middleware constant; logs state transitions
//                   to the default file sink (no console.log).
//
//   createLogger  — factory for a configurable logger: custom output
//                   sink, optional per-key diff, optional store label.
//
// Usage (simple):
//   import { createStore, logger } from '@termuijs/store';
//   const useStore = createStore(creator, { middleware: [logger] });
//
// Usage (configurable):
//   import { createStore, createLogger } from '@termuijs/store';
//   const useStore = createStore(creator, {
//       middleware: [createLogger({ name: 'counter', diff: true })],
//   });
// ─────────────────────────────────────────────────────

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Middleware } from './store.js';

// ── Types ──────────────────────────────────────────────

export interface LoggerOptions {
    /**
     * Custom output sink — receives one formatted line at a time.
     * Defaults to appending to `<tmpdir>/termuijs-store.log`.
     * Example: `output: (msg) => process.stderr.write(msg + '\n')`
     */
    output?: (message: string) => void;

    /**
     * Emit a per-key diff entry showing `from` → `to` for every key
     * whose value actually changed. Default: `true`.
     */
    diff?: boolean;

    /**
     * Label prepended to every log line, e.g. the store's name.
     * When omitted no label is prepended.
     */
    name?: string;
}

// ── Default output sink ────────────────────────────────

function defaultOutput(message: string): void {
    const logFile = path.join(os.tmpdir(), 'termuijs-store.log');
    try {
        fs.appendFileSync(logFile, message + '\n', 'utf8');
    } catch {
        // Swallow write errors — never crash the terminal app
    }
}

// ── Configurable logger factory ────────────────────────

/**
 * createLogger — produce a store middleware that logs state transitions
 * to a configurable output sink.
 *
 * ```typescript
 * const useStore = createStore(creator, {
 *     middleware: [
 *         createLogger({ name: 'myStore', diff: true }),
 *     ],
 * });
 * ```
 *
 * Every `setState` call emits two or three lines:
 *   `[label] <iso-timestamp> prev   {...}`
 *   `[label] <iso-timestamp> next   {...}`
 *   `[label] <iso-timestamp> diff   { key: { from: <old>, to: <new> } }`  ← when diff: true
 */
export function createLogger<T extends object>(options?: LoggerOptions): Middleware<T> {
    const write    = options?.output ?? defaultOutput;
    const showDiff = options?.diff ?? true;
    const prefix   = options?.name ? `[${options.name}] ` : '';

    return (prevState, update, next): void => {
        const nextState = next(update);
        const ts = new Date().toISOString();

        write(`${prefix}${ts} prev   ${JSON.stringify(prevState)}`);
        write(`${prefix}${ts} next   ${JSON.stringify(nextState)}`);

        if (showDiff) {
            // Cast narrows Object.keys(string[]) to actual keys of T for safe indexed access
            const changedKeys = (Object.keys(update) as (keyof T)[]).filter(
                // nextState is the value returned by next(update) in this chain — safe to treat as T
                (k) => !Object.is(prevState[k], (nextState as T)[k]),
            );

            if (changedKeys.length > 0) {
                // any required: state values are heterogeneous and cannot be statically narrowed
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const diffObj: Record<string, { from: any; to: any }> = {};
                for (const k of changedKeys) {
                    diffObj[k as string] = {
                        from: prevState[k],
                        // nextState asserted as T to allow indexing with keyof T safely
                        to:   (nextState as T)[k],
                    };
                }
                write(`${prefix}${ts} diff   ${JSON.stringify(diffObj)}`);
            }
        }
    };
}

// ── Simple logger constant ─────────────────────────────

/**
 * Drop-in logger middleware. Logs the previous and next state on every
 * `setState` call using the default file sink (`<tmpdir>/termuijs-store.log`).
 * Pass a custom `output` via `createLogger` to redirect to a different sink.
 *
 * ```typescript
 * const useStore = createStore(creator, { middleware: [logger] });
 * ```
 */
// any required: logger must accept arbitrary store shapes across all generic consumers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logger: Middleware<any> = createLogger();
