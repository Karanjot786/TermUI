// ─────────────────────────────────────────────────────
// @termuijs/jsx — Public API
// ─────────────────────────────────────────────────────

// ── JSX Factory ──
export { createElement, jsx, jsxs } from './createElement.js';
export { Fragment } from './vnode.js';

// ── Types ──
export type { VNode, VElement, VFragment, FC, IntrinsicProps } from './vnode.js';
export { isVElement, isVFragment, flattenChildren } from './vnode.js';

// ── Portal ──
export { createPortal } from './createPortal.js';

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
export { useMediaQuery } from './hooks/useMediaQuery.js';
export { useToggle } from './hooks/useToggle.js';
export type { AsyncState, KeyBinding, MotionPreferences } from './hooks.js';
export { useCounter } from './hooks/useCounter.js';
export type { UseCounterActions, UseCounterOptions } from './hooks/useCounter.js';
export { useBoolean } from './hooks/useBoolean.js';
export type { UseBooleanActions } from './hooks/useBoolean.js';
export { useClipboard } from './hooks/useClipboard.js';
export type { UseClipboardOptions, UseClipboardResult } from './hooks/useClipboard.js';
export { useList } from './hooks/useList.js';
export type { UseListActions } from './hooks/useList.js';
export { useMap } from './hooks/useMap.js';
export type { UseMapActions } from './hooks/useMap.js';
export { useUpdateEffect } from './hooks/useUpdateEffect.js';

export { useDefault } from './hooks/useDefault.js';
// ── Error Boundary ──
export { ErrorBoundary } from './error-boundary.js';
export type { ErrorBoundaryProps } from './error-boundary.js';

// ── Suspense / Lazy ──
export { Suspense } from './Suspense.js';
export type { SuspenseProps } from './Suspense.js';
export { lazy } from './lazy.js';

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
export { useFocusWithin } from './hooks/useFocusWithin.js';
export type { UseFocusWithinOptions } from './hooks/useFocusWithin.js';
export { useFocusTrap } from './hooks/useFocusTrap.js';
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
export type { KeyboardNavigationOptions, KeyboardNavigationResult } from './hooks/useKeyboardNavigation.js';
export { useModal } from './hooks/useModal.js';
export type { UseModalResult } from './hooks/useModal.js';

// ── Subprocess ──
export { useSubprocess } from './hooks/useSubprocess.js';
export type { UseSubprocessResult } from './hooks/useSubprocess.js';

// ── Render ──
export { render, renderApp } from './render.js';
export type { RenderOptions } from './render.js';
export { getCurrentApp } from './runtime.js';

// ── Reconciler (internal, but useful for testing) ──
export { reconcile, reRenderComponent, unmountAll } from './reconciler.js';

// ── Internal — used by @termuijs/testing ──
export { setRequestRender, getRequestRender, setInsertBefore, collectInputHandlers, destroyFiber } from './hooks.js';

// ── Convenience alias ──
/** h() — shorthand for createElement */
export { createElement as h } from './createElement.js';
export { useMount } from './hooks/useMount.js';
export { usePrevious } from './hooks/usePrevious.js';
export { useLatest } from './hooks/useLatest.js';
export { useFirstRender } from './hooks/useFirstRender.js';
export { useSyncExternalStore } from './hooks/useSyncExternalStore.js';
export { useHover } from './hooks/useHover.js';
export { useElementSize } from './hooks/useElementSize.js';
export type { ElementSize } from './hooks/useElementSize.js';
export { useDebounce } from './hooks/useDebounce.js';
export { useTerminalSize } from './hooks/useTerminalSize.js';
export type { TerminalSize } from './hooks/useTerminalSize.js';
export { useIsMounted } from './hooks/useIsMounted.js';
export { useUnmount } from './hooks/useUnmount.js';
export { useTransition } from './hooks/useTransition.js';
export { useStopwatch } from './hooks/useStopwatch.js';
export type { UseStopwatchOptions, UseStopwatchControls } from './hooks/useStopwatch.js';
