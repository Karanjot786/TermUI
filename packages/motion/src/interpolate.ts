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
 * Maps an input value using multi-stop arrays.
 */
export function interpolate(
    value: number,
    inputRange: number[],
    outputRange: number[],
    options?: InterpolateOptions
): number {
    if (inputRange.length !== outputRange.length) {
        throw new Error('inputRange and outputRange must have the same length.');
    }
    if (inputRange.length < 2) {
        throw new Error('inputRange and outputRange must have at least 2 elements.');
    }

    let index = 0;
    while (index < inputRange.length - 2 && value > inputRange[index + 1]) {
        index++;
    }

    return mapRange(
        value,
        inputRange[index],
        inputRange[index + 1],
        outputRange[index],
        outputRange[index + 1],
        options
    );
}
