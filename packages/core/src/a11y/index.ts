/**
 * Accessibility properties for widgets that expose metadata to screen readers.
 * Used with {@link emitA11y} to emit VTE-compatible OSC 133 sequences.
 */
export interface A11yProps {
    /**
     * ARIA-like role describing the element's purpose.
     * Supported values: 'region', 'alert', 'status', 'log', 'navigation'.
     * Defaults to 'region' if not specified.
     */
    role?: 'region' | 'alert' | 'status' | 'log' | 'navigation';
    /**
     * Accessible name for the element, read aloud by screen readers.
     * Should be a concise description of the region's content.
     */
    label?: string;
}

/**
 * Emit accessibility metadata via VTE-compatible OSC 133 sequences.
 *
 * Sends structured metadata that screen readers (e.g. Footnotes in VTE-based
 * terminals) can use to announce widget roles and labels. This is a no-op on
 * terminals that do not support VTE (checked via VTE_VERSION/TERM_PROGRAM).
 *
 * @param props - Accessibility properties (role, label). If undefined or empty, no metadata is emitted.
 * @param write - Callback to write the escape sequence to the terminal.
 * @param action - 'start' opens an accessible region, 'end' closes it.
 */
export function emitA11y(props: A11yProps | undefined, write: (data: string) => void, action: 'start' | 'end'): void {
    if (!props || (!props.role && !props.label)) return;

    const hasVTE = !!(process.env.VTE_VERSION || process.env.TERM_PROGRAM === 'iTerm.app' || process.env.TERM_PROGRAM === 'apple');
    if (!hasVTE) return;

    if (action === 'start') {
        const metadata = `role=${props.role || 'region'}${props.label ? `;label=${props.label}` : ''}`;
        write(`\x1b]133;A;${metadata}\x07`);
    } else if (action === 'end') {
        write(`\x1b]133;B\x07`);
    }
}
