// useCommandPalette — convenience hook for wiring CommandPalette to an App
import type { KeyEvent } from '@termuijs/core';
import { CommandPalette, type Command, type CommandPaletteOptions } from '../CommandPalette.js';

export interface UseCommandPaletteOptions extends CommandPaletteOptions {
    /** Initial command list */
    commands: Command[];
}

export interface UseCommandPaletteReturn {
    /** The CommandPalette widget instance — add it to your layout */
    palette: CommandPalette;
    /**
     * Pass this directly to your app's key event listener.
     *
     * @example
     * ```ts
     * const { palette, handleKey } = useCommandPalette({ commands })
     * app.on('key', handleKey)
     * layout.add(palette)
     * ```
     */
    handleKey: (event: KeyEvent) => void;
}

/**
 * Create a CommandPalette and return the widget plus a bound key handler.
 *
 * The handler automatically wires Ctrl+P (open/close), arrow navigation,
 * Enter, Escape, Backspace, and character input — no manual binding needed.
 *
 * @example
 * ```ts
 * import { useCommandPalette } from '@termuijs/ui'
 *
 * const { palette, handleKey } = useCommandPalette({
 *   commands: [
 *     { id: 'save', label: 'Save File', shortcut: 'Ctrl+S', action: () => save() },
 *     { id: 'quit', label: 'Quit', category: 'App', action: () => process.exit(0) },
 *   ],
 * })
 *
 * app.on('key', handleKey)
 * rootLayout.add(palette)
 * ```
 */
export function useCommandPalette(options: UseCommandPaletteOptions): UseCommandPaletteReturn {
    const { commands, ...paletteOptions } = options;
    const palette = new CommandPalette(commands, paletteOptions);
    const handleKey = (event: KeyEvent) => palette.handleKey(event);
    return { palette, handleKey };
}