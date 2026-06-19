import { ansi } from '@termuijs/core';
import { useEffect } from '../hooks.js';

export type ViewMetaCursor = 'block' | 'underline' | 'bar';

export type ViewMetaMouseMode = 'none' | 'click' | 'drag';

export interface ViewMeta {
    title?: string;
    cursor?: ViewMetaCursor;
    mouseMode?: ViewMetaMouseMode;
}

const defaultCursorShape = `${ansi.CSI}0 q`;
const clickMouseMode = `${ansi.CSI}?1000h${ansi.CSI}?1006h`;
const dragMouseMode = `${ansi.CSI}?1000h${ansi.CSI}?1002h${ansi.CSI}?1006h`;

function writeAnsi(sequence: string): void {
    process.stdout.write(sequence);
}

function mouseModeSequence(mode: ViewMetaMouseMode): string {
    if (mode === 'click') {
        return clickMouseMode;
    }

    if (mode === 'drag') {
        return dragMouseMode;
    }

    return ansi.disableMouse;
}

export function useViewMeta(meta: ViewMeta): void {
    const { title, cursor, mouseMode } = meta;

    useEffect(() => {
        const restoreTitle = title !== undefined;
        const restoreCursor = cursor !== undefined;
        const restoreMouseMode = mouseMode !== undefined;

        if (title !== undefined) {
            writeAnsi(ansi.setTitle(title));
        }

        if (cursor !== undefined) {
            writeAnsi(ansi.cursorShape(cursor, false));
        }

        if (mouseMode !== undefined) {
            writeAnsi(mouseModeSequence(mouseMode));
        }

        return () => {
            if (restoreTitle) {
                writeAnsi(ansi.setTitle(''));
            }

            if (restoreCursor) {
                writeAnsi(defaultCursorShape);
            }

            if (restoreMouseMode) {
                writeAnsi(ansi.disableMouse);
            }
        };
    }, [title, cursor, mouseMode]);
}
