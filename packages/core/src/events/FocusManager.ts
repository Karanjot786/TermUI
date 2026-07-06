// ─────────────────────────────────────────────────────
// @termuijs/core — Focus Manager
// ─────────────────────────────────────────────────────

import { EventEmitter } from './EventEmitter.js';
import type { FocusEvent } from './types.js';
import type { Rect } from '../layout/Rect.js';

export interface Focusable {
    id: string;
    tabIndex: number;
    focusable: boolean;
}

/**
 * Manages tab-order focus cycling between focusable widgets.
 * Dispatches focus/blur events when focus changes.
 *
 * Supports:
 * - Tab-order cycling (focusNext/focusPrev)
 * - Focus trapping (for modals — limits Tab to a container)
 * - Focus groups (for arrow-key navigation within a group)
 * - 2D Spatial navigation (focusUp/Down/Left/Right)
 */
export class FocusManager {
    private _focusables: Focusable[] = [];
    private _currentIndex = -1;
    private _events = new EventEmitter<{ focus: FocusEvent; blur: FocusEvent }>();

    /**
     * Stack of trap container IDs. When non-empty, only focusables
     * that belong to the topmost trap container are reachable via Tab.
     */
    private _trapStack: string[] = [];

    /**
     * Parallel stack to _trapStack. Captures the focused widget ID
     * before each trap() call so release() can restore it.
     */
    private _preTrapFocus: string[] = [];

    /**
     * Map of container ID → child widget IDs that belong to it.
     * Used for trap membership lookup.
     */
    private _containerMembers: Map<string, Set<string>> = new Map();

    /**
     * Named focus groups. Arrow keys move within a group, Tab moves between groups.
     * Maps groupId → ordered list of widget IDs.
     */
    private _groups: Map<string, string[]> = new Map();

    /**
     * Record of on-screen rects for widgets, used for spatial navigation.
     */
    private _rects: Map<string, Rect> = new Map();

    /** Monotonically increasing epoch for ordered event sequencing */
    private _epoch = 0;

    /** Queue of focus state changes accumulated before start() is called */
    private _pendingQueue: Array<FocusEvent> = [];

    /** True once start() has been called — enables event emission */
    private _started = false;

    /** Currently focused widget ID, or null if none */
    get currentId(): string | null {
        if (this._currentIndex < 0 || this._currentIndex >= this._focusables.length) {
            return null;
        }
        return this._focusables[this._currentIndex].id;
    }

    /** Subscribe to focus/blur events */
    on<K extends 'focus' | 'blur'>(event: K, handler: (data: FocusEvent) => void): () => void {
        return this._events.on(event, handler);
    }

    /**
     * Enable event emission and replay any queued focus events.
     * Call this from App.mount() after _subscribeFocusEvents().
     */
    start(): void {
        if (this._started) return;
        this._started = true;
        // Replay queued focus events
        for (const evt of this._pendingQueue) {
            this._events.emit(evt.type, evt);
        }
        this._pendingQueue = [];
    }

    /**
     * Register a focusable widget.
     * Widgets are ordered by tabIndex (ascending), then insertion order.
     * Before start() is called, events are queued rather than emitted so
     * they are not lost when App has not yet subscribed to them.
     */
    register(focusable: Focusable): void {
        // Preserve currently focused id so that sorting the master list
        // does not accidentally change which widget is focused.
        const prevFocusedId = this.currentId;

        this._focusables.push(focusable);
        this._focusables.sort((a, b) => a.tabIndex - b.tabIndex);

        // If there was a previously focused widget, relocate _currentIndex
        // to point to the same widget after the sort.
        if (prevFocusedId) {
            const newIdx = this._focusables.findIndex(f => f.id === prevFocusedId);
            if (newIdx >= 0) this._currentIndex = newIdx;
        }

        // Auto-focus the first widget if nothing is focused
        if (this._currentIndex < 0 && focusable.focusable) {
            this._currentIndex = this._focusables.indexOf(focusable);
            const event: FocusEvent = { targetId: focusable.id, type: 'focus', epoch: this._epoch++ };
            if (this._started) {
                this._events.emit('focus', event);
            } else {
                this._pendingQueue.push(event);
            }
        }
    }

    /**
     * Unregister a focusable widget.
     */
    unregister(id: string): void {
        const idx = this._focusables.findIndex(f => f.id === id);
        if (idx < 0) return;

        // Clean up spatial rect to prevent memory leaks
        this._rects.delete(id);

        const wasFocused = idx === this._currentIndex;
        this._focusables.splice(idx, 1);

        if (wasFocused) {
            // The focused widget is being removed — emit blur for it, then
            // move focus to the next available widget if one exists.
            this._events.emit('blur', { targetId: id, type: 'blur', epoch: this._epoch++ });
            if (this._focusables.length > 0) {
                this._currentIndex = Math.min(this._currentIndex, this._focusables.length - 1);
                this._events.emit('focus', {
                    targetId: this._focusables[this._currentIndex].id,
                    type: 'focus',
                    epoch: this._epoch++,
                });
            } else {
                this._currentIndex = -1;
            }
        } else if (idx < this._currentIndex) {
            // A non-focused widget before the focused one was removed —
            // just adjust the index. No blur/focus events because the
            // focused widget hasn't changed.
            this._currentIndex--;
        }
    }

    /**
     * Move focus to the next focusable widget (wraps around).
     * Respects focus traps — if a trap is active, only cycles within it.
     */
    focusNext(): void {
        const candidates = this._getActiveFocusables();
        if (candidates.length === 0) return;

        const currentInCandidates = this.currentId
            ? candidates.findIndex(f => f.id === this.currentId)
            : -1;

        let next = (currentInCandidates + 1) % candidates.length;
        const start = next;

        // Skip non-focusable widgets
        while (!candidates[next].focusable) {
            next = (next + 1) % candidates.length;
            if (next === start) return; // All non-focusable
        }

        // Find this candidate's index in the master list
        const masterIdx = this._focusables.findIndex(f => f.id === candidates[next].id);
        if (masterIdx >= 0) this._changeFocus(masterIdx);
    }

    /**
     * Move focus to the previous focusable widget (wraps around).
     * Respects focus traps.
     */
    focusPrev(): void {
        const candidates = this._getActiveFocusables();
        if (candidates.length === 0) return;

        const currentInCandidates = this.currentId
            ? candidates.findIndex(f => f.id === this.currentId)
            : 0;

        let prev = (currentInCandidates - 1 + candidates.length) % candidates.length;
        const start = prev;

        while (!candidates[prev].focusable) {
            prev = (prev - 1 + candidates.length) % candidates.length;
            if (prev === start) return;
        }

        const masterIdx = this._focusables.findIndex(f => f.id === candidates[prev].id);
        if (masterIdx >= 0) this._changeFocus(masterIdx);
    }

    /**
     * Focus a specific widget by ID.
     */
    focusWidget(id: string): void {
        const idx = this._focusables.findIndex(f => f.id === id);
        if (idx < 0 || !this._focusables[idx].focusable) return;
        this._changeFocus(idx);
    }

    /**
     * Check if a specific widget currently has focus.
     */
    isFocused(id: string): boolean {
        return this.currentId === id;
    }

    // ── Focus Trap ──────────────────────────────────────

    /**
     * Register widget IDs as members of a container (for trap lookup).
     */
    registerContainerMembers(containerId: string, memberIds: string[]): void {
        const set = this._containerMembers.get(containerId) ?? new Set();
        for (const id of memberIds) set.add(id);
        this._containerMembers.set(containerId, set);
    }

    /**
     * Unregister a container's member list.
     */
    unregisterContainerMembers(containerId: string): void {
        this._containerMembers.delete(containerId);
    }

    /**
     * Trap focus within a container. Only focusables inside the
     * container are reachable via Tab. Traps are stacked —
     * nested modals create nested traps.
     */
    trap(containerId: string): void {
        this._preTrapFocus.push(this.currentId ?? '');
        this._trapStack.push(containerId);

        // Focus the first focusable inside the trap
        const trapped = this._getActiveFocusables();
        if (trapped.length > 0) {
            const first = trapped.find(f => f.focusable);
            if (first) {
                const idx = this._focusables.findIndex(f => f.id === first.id);
                if (idx >= 0) this._changeFocus(idx);
            }
        }
    }

    // REPLACE WITH:
    /**
     * Release a focus trap by container ID.
     *
     * - Must be called with the same containerId passed to trap().
     * - Must be called in LIFO order — innermost trap released first.
     * - Emits console.warn and is a no-op if stack is empty or ID mismatches.
     * - Restores focus to the widget that was focused before trap() was called.
     */
    release(containerId: string): void {
        if (this._trapStack.length === 0) {
            console.warn('FocusManager.release(): called with empty trap stack — ignoring.');
            return;
        }

        const top = this._trapStack[this._trapStack.length - 1];
        if (top !== containerId) {
            console.warn(
                `FocusManager.release(): expected "${top}" but got "${containerId}" — ignoring. ` +
                `Ensure nested modals are released in LIFO order.`
            );
            return;
        }

        this._trapStack.pop();

        // Restore focus to what was focused before this trap was activated
        const previousFocusId = this._preTrapFocus.pop();
        if (previousFocusId) {
            this.focusWidget(previousFocusId);
        }
    }

    /** Whether a focus trap is currently active */
    get isTrapped(): boolean {
        return this._trapStack.length > 0;
    }

    /** ID of the current trap container, or null */
    get currentTrapId(): string | null {
        return this._trapStack.length > 0
            ? this._trapStack[this._trapStack.length - 1]
            : null;
    }

    // ── Focus Groups ────────────────────────────────────

    /**
     * Register a focus group. Arrow keys move within the group.
     * @param groupId   Unique group identifier
     * @param widgetIds Ordered list of widget IDs in the group
     */
    registerGroup(groupId: string, widgetIds: string[]): void {
        this._groups.set(groupId, widgetIds);
    }

    /**
     * Unregister a focus group.
     */
    unregisterGroup(groupId: string): void {
        this._groups.delete(groupId);
    }

    /**
     * Move focus to the next widget within the same group.
     * Returns true if focus was moved, false if the widget isn't in a group.
     */
    focusNextInGroup(): boolean {
        const currentId = this.currentId;
        if (!currentId) return false;

        for (const [, ids] of this._groups) {
            const idx = ids.indexOf(currentId);
            if (idx >= 0) {
                const nextIdx = (idx + 1) % ids.length;
                this.focusWidget(ids[nextIdx]);
                return true;
            }
        }
        return false;
    }

    /**
     * Move focus to the previous widget within the same group.
     */
    focusPrevInGroup(): boolean {
        const currentId = this.currentId;
        if (!currentId) return false;

        for (const [, ids] of this._groups) {
            const idx = ids.indexOf(currentId);
            if (idx >= 0) {
                const prevIdx = (idx - 1 + ids.length) % ids.length;
                this.focusWidget(ids[prevIdx]);
                return true;
            }
        }
        return false;
    }

    // ── Spatial Navigation ──────────────────────────────

    /** Record the on-screen rect for a widget, used for spatial navigation. */
    setRect(id: string, rect: Rect): void {
        this._rects.set(id, rect);
    }

    private _spatialFocus(
        isValid: (cx: number, cy: number, tx: number, ty: number) => boolean,
        calcDistance: (cx: number, cy: number, tx: number, ty: number) => number
    ): boolean {
        const currentId = this.currentId;
        if (!currentId) return false;

        const currentRect = this._rects.get(currentId);
        if (!currentRect) return false;

        const cx = currentRect.x + currentRect.width / 2;
        const cy = currentRect.y + currentRect.height / 2;

        let bestId: string | null = null;
        let minDistance = Infinity;

        // Iterate over active focusables to respect traps
        const candidates = this._getActiveFocusables();

        for (const node of candidates) {
            if (!node.focusable || node.id === currentId) continue;
            
            const targetRect = this._rects.get(node.id);
            if (!targetRect) continue;

            const tx = targetRect.x + targetRect.width / 2;
            const ty = targetRect.y + targetRect.height / 2;

            if (isValid(cx, cy, tx, ty)) {
                const dist = calcDistance(cx, cy, tx, ty);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestId = node.id;
                }
            }
        }

        if (bestId) {
            this.focusWidget(bestId);
            return true;
        }
        return false;
    }

    /** Move focus to the nearest focusable widget above the current one. */
    focusUp(): boolean {
        return this._spatialFocus(
            (cx, cy, tx, ty) => ty < cy,
            (cx, cy, tx, ty) => (cy - ty) + Math.abs(tx - cx)
        );
    }

    /** Move focus to the nearest focusable widget below the current one. */
    focusDown(): boolean {
        return this._spatialFocus(
            (cx, cy, tx, ty) => ty > cy,
            (cx, cy, tx, ty) => (ty - cy) + Math.abs(tx - cx)
        );
    }

    /** Move focus to the nearest focusable widget to the left of the current one. */
    focusLeft(): boolean {
        return this._spatialFocus(
            (cx, cy, tx, ty) => tx < cx,
            (cx, cy, tx, ty) => (cx - tx) + Math.abs(ty - cy)
        );
    }

    /** Move focus to the nearest focusable widget to the right of the current one. */
    focusRight(): boolean {
        return this._spatialFocus(
            (cx, cy, tx, ty) => tx > cx,
            (cx, cy, tx, ty) => (tx - cx) + Math.abs(ty - cy)
        );
    }

    // ── Private ──────────────────────────────────────────

    /**
     * Get the active focusables, filtered by the current trap if any.
     */
    private _getActiveFocusables(): Focusable[] {
        if (this._trapStack.length === 0) return this._focusables;

        const containerId = this._trapStack[this._trapStack.length - 1];
        const members = this._containerMembers.get(containerId);
        if (!members) return this._focusables;

        return this._focusables.filter(f => members.has(f.id));
    }

    private _changeFocus(newIndex: number): void {
        const oldId = this.currentId;
        const events: Array<{ type: 'focus' | 'blur'; data: FocusEvent }> = [];

        if (oldId) {
            events.push({ type: 'blur', data: { targetId: oldId, type: 'blur', epoch: this._epoch++ } });
        }
        this._currentIndex = newIndex;
        events.push({
            type: 'focus',
            data: {
                targetId: this._focusables[newIndex].id,
                type: 'focus',
                epoch: this._epoch++,
            },
        });

        // Flush events after state is fully updated so that any re-entrant calls
        // (e.g., handlers that call unregister()) see the finalized _currentIndex.
        for (const evt of events) {
            this._events.emit(evt.type, evt.data);
        }
    }
}