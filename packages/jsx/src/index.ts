// ─────────────────────────────────────────────────────
// @termuijs/jsx — Public API
// ─────────────────────────────────────────────────────

// ── JSX Factory ──
export { createElement, jsx, jsxs } from './createElement.js';
export { Fragment } from './vnode.js';

// ── Types ──
export type { VNode, VElement, VFragment, FC, IntrinsicProps } from './vnode.js';
export { isVElement, isVFragment, flattenChildren } from './vnode.js';

// ── Hooks ──
export {
    useState,
    useId,
    useEffect,
    useInput,
    useInterval,
    useMemo,
    useRef,
    useImperativeHandle,
    useCallback,
    useAsync,
    useKeymap,
    useMotion,
    useInsertBefore,
    useReducer,
} from './hooks.js';
export type { AsyncState, KeyBinding, MotionPreferences } from './hooks.js';

// ── Error Boundary ──
export { ErrorBoundary } from './error-boundary.js';
export type { ErrorBoundaryProps } from './error-boundary.js';

// ── Context ──
export { createContext, useContext } from './context.js';
export type { Context } from './context.js';

// ── Memoization ──
export { memo } from './memo.js';

// ── Focus Management ──
export { FocusContext } from './focus-context.js';
export type { FocusContextValue } from './focus-context.js';
export { useFocusManager } from './hooks/useFocusManager.js';
export type { UseFocusManagerResult } from './hooks/useFocusManager.js';
export { useFocus } from './hooks/useFocus.js';
export type { UseFocusOptions, UseFocusResult } from './hooks/useFocus.js';
export { useFocusTrap } from './hooks/useFocusTrap.js';
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
export type { KeyboardNavigationOptions, KeyboardNavigationResult } from './hooks/useKeyboardNavigation.js';

// ── Subprocess ──
export { useSubprocess } from './hooks/useSubprocess.js';
export type { UseSubprocessResult } from './hooks/useSubprocess.js';
// ── Render ──
export { render, renderApp } from './render.js';
export type { RenderOptions } from './render.js';

// ── Reconciler (internal, but useful for testing) ──
export { reconcile, reRenderComponent, unmountAll } from './reconciler.js';

// ── Internal — used by @termuijs/testing ──
export { setRequestRender, getRequestRender, setInsertBefore, collectInputHandlers, destroyFiber } from './hooks.js';

// ── Convenience alias ──
/** h() — shorthand for createElement */
export { createElement as h } from './createElement.js';
