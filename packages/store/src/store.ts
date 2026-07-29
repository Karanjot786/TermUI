// ─────────────────────────────────────────────────────
// @termuijs/store — Zustand-like State Management
//
// Minimal, powerful state management for terminal apps.
// Create stores with actions, use them in components
// with selector-based subscriptions.
//
// Usage:
//   const useCounter = createStore((set) => ({
//       count: 0,
//       increment: () => set(s => ({ count: s.count + 1 })),
//       reset: () => set({ count: 0 }),
//   }));
//
//   function Counter() {
//       const count = useCounter(s => s.count);
//       const increment = useCounter(s => s.increment);
//       useInput((key) => { if (key === '+') increment(); });
//       return <Text>Count: {count}</Text>;
//   }
// ─────────────────────────────────────────────────────
import { produce } from 'immer';
import { useState, useEffect, useRef } from '@termuijs/jsx';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import type { EqualityFn } from './shallow.js'


// ── Batch Mechanism ──

interface BatchEntry<T> {
    prevState: T;
    nextState: T;
    changes: Partial<T>;
    commit: () => T;
    rollback: () => void;
}

let _batchDepth = 0;
let _batchEpoch = 0;
// Map store instance to batch entry. Using any for listener set type because
// the batch mechanism operates on the raw Set<Listener<T>> without knowing T at this level.
const _batchStores = new Map<Set<any>, BatchEntry<any>>();
/**
 * Batch multiple state updates into a single render pass.
 *
 * Coalesces all setState calls within the same microtask tick
 * into a single reconciler update, reducing unnecessary re-renders.
 *
 * ```tsx
 * // Without batch: 3 re-renders
 * store.setState({ x: 1 });
 * store.setState({ y: 2 });
 * store.setState({ z: 3 });
 *
 * // With batch: 1 re-render
 * batch(() => {
 *     store.setState({ x: 1 });
 *     store.setState({ y: 2 });
 *     store.setState({ z: 3 });
 * });
 * ```
 */
export function batch<T>(fn: () => T): T {
    const isOutermost = _batchDepth === 0;
    _batchDepth++;
    if (isOutermost) _batchEpoch++;
    let threw = false;
    let res: any;
    try {
        res = fn();
    } catch (err) {
        threw = true;
        _batchDepth--;
        if (_batchDepth === 0) {
            flushBatch(threw);
        }
        throw err;
    }

    if (res && typeof res.then === 'function') {
        return (res as Promise<any>).then(
        .catch(err => console.error(err))