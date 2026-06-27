export interface A11yProps {
    role?: 'region' | 'alert' | 'status' | 'log' | 'navigation';
    label?: string;
}

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
