export function evalCalc(expression: string): number {
    try {
        // Basic arithmetic evaluator (+ - * / parentheses)
        // NOTE: safe for controlled internal use
        return Function(`"use strict"; return (${expression})`)();
    } catch {
        throw new Error(`Invalid calc expression: ${expression}`);
    }
}