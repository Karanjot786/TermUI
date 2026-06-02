import { useState, useRef } from '@termuijs/jsx';

export interface UseVirtualRowsOptions {
    /** Total number of rows in the dataset */
    totalRows: number;
    /** Lazy cell content fetch callback */
    getCell: (row: number, col: number) => string;
    /** Optional callback to get a stable unique key for a row */
    getRowKey?: (row: number) => string;
    /** Optional callback to get a stable unique key for a column */
    getColKey?: (col: number) => string;
}

export interface VirtualRowsState {
    totalRows: number;
    getCell: (row: number, col: number) => string;
    getRowKey?: (row: number) => string;
    getColKey?: (col: number) => string;
    selectedIndex: number;
    setSelectedIndex: (index: number | ((prev: number) => number)) => void;
    scrollOffset: number;
    setScrollOffset: (offset: number | ((prev: number) => number)) => void;
}

/**
 * useVirtualRows — Hook for lazy-fetching and row virtualization inside a Table widget.
 */
export function useVirtualRows(options: UseVirtualRowsOptions): VirtualRowsState {
    const { totalRows, getCell, getRowKey, getColKey } = options;

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollOffset, setScrollOffset] = useState(0);

    const prevKeyRef = useRef<string | undefined>(undefined);
    const prevIndexRef = useRef<number | undefined>(undefined);

    // Clamp the selected index to valid range
    let clampedIndex = totalRows <= 0 ? 0 : Math.max(0, Math.min(selectedIndex, totalRows - 1));
    let currentSelectedIndex = clampedIndex;

    if (getRowKey) {
        const isUserChange = prevIndexRef.current !== undefined && selectedIndex !== prevIndexRef.current;
        
        if (!isUserChange && prevKeyRef.current !== undefined) {
            let foundIndex = -1;
            // Check if it's still at the same index first
            if (
                currentSelectedIndex >= 0 &&
                currentSelectedIndex < totalRows &&
                getRowKey(currentSelectedIndex) === prevKeyRef.current
            ) {
                foundIndex = currentSelectedIndex;
            } else {
                // Search the new dataset for the previously selected key
                for (let r = 0; r < totalRows; r++) {
                    if (getRowKey(r) === prevKeyRef.current) {
                        foundIndex = r;
                        break;
                    }
                }
            }

            if (foundIndex !== -1 && foundIndex !== currentSelectedIndex) {
                currentSelectedIndex = foundIndex;
            }
        }
    }

    // Schedule state updates if index was clamped or moved due to key stability
    if (currentSelectedIndex !== selectedIndex) {
        setSelectedIndex(currentSelectedIndex);
    }

    // Update refs for next render
    prevIndexRef.current = currentSelectedIndex;
    if (getRowKey && currentSelectedIndex >= 0 && currentSelectedIndex < totalRows) {
        prevKeyRef.current = getRowKey(currentSelectedIndex);
    } else {
        prevKeyRef.current = undefined;
    }

    return {
        totalRows,
        getCell,
        getRowKey,
        getColKey,
        selectedIndex: currentSelectedIndex,
        setSelectedIndex,
        scrollOffset,
        setScrollOffset,
    };
}
