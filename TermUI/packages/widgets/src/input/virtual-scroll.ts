export interface ScrollRange {
    start: number;    // first item index to render
    end: number;      // one past last item index to render (exclusive)
    offsetPx: number; // scroll offset in pixels (for variable height)
}

/**
 * Compute visible range for fixed-height items.
 * @param scrollOffset - first visible item index (scroll position in items, NOT pixels)
 * @param viewportItems - number of items visible in the viewport
 * @param itemCount - total number of items
 * @param overscan - extra items to render beyond viewport edges (default: 2)
 */
export function computeRange(
    scrollOffset: number,
    viewportItems: number,
    itemCount: number,
    overscan = 2,
): ScrollRange {
    const start = Math.max(0, scrollOffset - overscan);
    const end = Math.min(itemCount, scrollOffset + viewportItems + overscan);
    return { start, end, offsetPx: start };
}

/**
 * Compute visible range for variable-height items.
 * @param scrollPx - scroll position in pixels
 * @param viewportPx - viewport height in pixels
 * @param sizes - array of item heights in pixels
 * @param overscan - extra items to render (default: 2)
 */
export function computeVariableRange(
    scrollPx: number,
    viewportPx: number,
    sizes: number[],
    overscan = 2,
): ScrollRange {
    const cumulative: number[] = [];
    let sum = 0;
    for (const s of sizes) {
        cumulative.push(sum);
        sum += s;
    }
    cumulative.push(sum); // sentinel

    // First item that starts within or before the viewport
    let startIdx = cumulative.findIndex((c, i) => i < sizes.length && c + sizes[i] > scrollPx);
    if (startIdx < 0) startIdx = sizes.length;
    startIdx = Math.max(0, startIdx - overscan);

    // Last item that starts before viewport end
    const viewportEnd = scrollPx + viewportPx;
    let endIdx = cumulative.findIndex((c) => c >= viewportEnd);
    if (endIdx < 0) endIdx = sizes.length;
    endIdx = Math.min(sizes.length, endIdx + overscan);

    return { start: startIdx, end: endIdx, offsetPx: cumulative[startIdx] };
}
