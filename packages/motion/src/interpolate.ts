// ─────────────────────────────────────────────────────
// @termuijs/motion — Interpolation helpers
// ─────────────────────────────────────────────────────

export interface InterpolateOptions {
    /** Clamp the result to [outMin, outMax]. Default true. */
    clamp?: boolean;
}

/**
 * Maps an input value from one numeric range to an output range.
 */
export function mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
    options?: InterpolateOptions
): number {
    const clamp = options?.clamp ?? true;

    if (inMin === inMax) {
        return outMin;
    }

    const mapped = outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);

    if (clamp) {
        const min = Math.min(outMin, outMax);
        const max = Math.max(outMin, outMax);
        if (mapped < min) return min;
        if (mapped > max) return max;
    }

    return mapped;
}

/**
 * Maps an input value using tuple ranges.
 */
export function interpolate(
    value: number,
    inputRange: [number, number],
    outputRange: [number, number],
    options?: InterpolateOptions
): number {
    return mapRange(
        value,
        inputRange[0],
        inputRange[1],
        outputRange[0],
        outputRange[1],
        options
    );
}
