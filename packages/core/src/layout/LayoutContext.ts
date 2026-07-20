/**
 * Evaluation context for the position and dimension algebra system.
 *
 * Passed to every `Pos` and `Dim` evaluator during layout resolution.
 * Properties are read lazily to enforce topological evaluation order.
 */
export interface LayoutContext {
    /** Width of the parent container in cells. */
    parentWidth: number;
    /** Height of the parent container in cells. */
    parentHeight: number;
    /** Width available for content after padding/borders in cells. */
    contentWidth: number;
    /** Height available for content after padding/borders in cells. */
    contentHeight: number;
    
    // Node properties (will be evaluated lazily to enforce topological sort)
    /** Computed width of the current element in cells (lazily evaluated). */
    readonly elementWidth: number;
    /** Computed height of the current element in cells (lazily evaluated). */
    readonly elementHeight: number;
    /** Computed X position of the current element in cells (lazily evaluated). */
    readonly elementX: number;
    /** Computed Y position of the current element in cells (lazily evaluated). */
    readonly elementY: number;
    
    /** Layout direction: 'horizontal' for rows, 'vertical' for columns. */
    axis: 'horizontal' | 'vertical';
    
    /**
     * Query the computed size of a named group container.
     * @param groupId - The group identifier to look up.
     * @returns The group's computed size in cells along the current axis.
     */
    getGroupSize(groupId: string): number;
}
