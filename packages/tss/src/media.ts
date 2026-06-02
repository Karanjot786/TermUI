// ─────────────────────────────────────────────────────
// @termuijs/tss — Media Query Evaluation
// ─────────────────────────────────────────────────────

export interface TerminalDimensions {
    cols: number;
    rows: number;
}

/**
 * Evaluates a TSS media query against the current terminal dimensions.
 * Supports min-width, max-width, min-height, and max-height.
 * Multiple conditions can be chained with 'and'.
 *
 * @param query The media query string (e.g., "(min-width: 80) and (max-height: 24)")
 * @param dimensions The current terminal columns and rows
 * @returns true if the media query matches, false otherwise
 */
export function matchMedia(query: string, dimensions: TerminalDimensions): boolean {
    if (!query || query.trim() === '') {
        return true;
    }

    // Split on 'and' (case insensitive), allowing for surrounding whitespace
    const conditions = query.split(/\band\b/i).map(c => c.trim());

    for (const condition of conditions) {
        // Match CSS-style (feature: value) with tolerant spacing
        const match = condition.match(/\(\s*([a-z-]+)\s*:\s*(\d+)\s*\)/i);
        
        if (!match) {
            return false; // Malformed condition fails by default to prevent false positives
        }

        const feature = match[1].toLowerCase();
        const value = parseInt(match[2], 10);

        if (isNaN(value)) return false;

        switch (feature) {
            case 'min-width':
                if (dimensions.cols < value) return false;
                break;
            case 'max-width':
                if (dimensions.cols > value) return false;
                break;
            case 'min-height':
                if (dimensions.rows < value) return false;
                break;
            case 'max-height':
                if (dimensions.rows > value) return false;
                break;
            default:
                // Unsupported media feature (like color schemes or orientation) degrades gracefully to false
                return false;
        }
    }

    return true; // All chained conditions passed
}