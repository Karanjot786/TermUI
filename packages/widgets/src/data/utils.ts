/**
 * Validate that a value is a finite number. Returns the clamped value if valid,
 * or the provided fallback (default 0) if the value is NaN / +/-Infinity.
 */
export function validateFinite(value: number, fallback = 0, min?: number, max?: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;
    return value;
}

/**
 * Filter NaN/Infinity from a numeric array, replacing with fallback.
 */
export function filterFinite(values: number[], fallback = 0): number[] {
    return values.map(v => Number.isFinite(v) ? v : fallback);
}
