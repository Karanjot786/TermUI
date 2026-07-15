/**
 * Memoization hooks
 */

import { useRef, useState } from '../index';

interface MemoizedValue<T> {
  value: T;
  dependencies: any[];
}

/**
 * useMemo - Memoize expensive computations
 */
export function useMemo<T>(
  factory: () => T,
  dependencies: any[]
): T {
  const memoizedRef = useRef<MemoizedValue<T> | null>(null);
  
  if (!memoizedRef.current) {
    // First render - compute value
    const value = factory();
    memoizedRef.current = {
      value,
      dependencies: [...dependencies]
    };
    return value;
  }

  // Check dependencies
  const hasChanged = dependencies.some(
    (dep, index) => dep !== memoizedRef.current!.dependencies[index]
  );

  if (hasChanged) {
    // Recompute
    const value = factory();
    memoizedRef.current = {
      value,
      dependencies: [...dependencies]
    };
    return value;
  }

  return memoizedRef.current.value;
}

/**
 * useCallback - Memoize functions
 */
export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[]
): T {
  return useMemo(() => callback, dependencies);
}

/**
 * React.memo equivalent - Memoize component
 */
export function memo<P extends object>(
  Component: (props: P) => any,
  areEqual?: (prevProps: P, nextProps: P) => boolean
): (props: P) => any {
  let prevProps: P | null = null;
  let prevResult: any = null;

  return (props: P) => {
    if (prevProps === null) {
      prevProps = props;
      prevResult = Component(props);
      return prevResult;
    }

    // Check if props are equal
    const areEqualFn = areEqual ?? defaultAreEqual;
    if (areEqualFn(prevProps, props)) {
      return prevResult;
    }

    // Update
    prevProps = props;
    prevResult = Component(props);
    return prevResult;
  };
}

/**
 * Default equality check
 */
function defaultAreEqual(prevProps: any, nextProps: any): boolean {
  const keys1 = Object.keys(prevProps);
  const keys2 = Object.keys(nextProps);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}