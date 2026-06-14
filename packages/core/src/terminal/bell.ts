/**
 * Triggers the terminal bell using the BEL control character (\x07).
 * This will usually cause a system beep or a visual flash depending on
 * the terminal emulator's configuration.
 */
export function bell(): void {
    if (typeof process !== 'undefined' && process.stdout && process.stdout.write) {
        process.stdout.write('\x07');
    }
}
