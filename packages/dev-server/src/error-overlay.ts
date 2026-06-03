// ─────────────────────────────────────────────────────
// @termuijs/dev-server — Full-screen Error Overlay
// ─────────────────────────────────────────────────────

import { Screen, type LayoutNode, type RootWidget, stripAnsi, createLayoutNode, defaultStyle } from '@termuijs/core';

export interface ParsedError {
    name: string;
    message: string;
    file?: string;
    line?: number;
    column?: number;
    rawStack: string[];
}

/**
 * Parse standard Node/Bun error stack traces from stderr.
 */
export function parseErrorStack(rawStderr: string): ParsedError {
    const cleanStderr = stripAnsi(rawStderr);
    const lines = cleanStderr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    let name = 'Error';
    let message = 'An unknown error occurred';
    let file: string | undefined;
    let line: number | undefined;
    let column: number | undefined;
    const rawStack: string[] = [];

    let errorHeaderLine = '';
    for (const l of lines) {
        if (l.startsWith('at ') || l.startsWith('at') || l.includes('    at')) {
            rawStack.push(l.replace(/^\s*at\s+/, 'at '));
        } else if (!errorHeaderLine && (l.includes('Error:') || l.includes('Exception:') || l.match(/^[A-Z][a-zA-Z0-9]*Error:/))) {
            errorHeaderLine = l;
        } else if (!errorHeaderLine) {
            // Fallback to first line that isn't a code frame or compiler visual guide
            if (!l.includes(' | ') && !l.includes('^')) {
                errorHeaderLine = l;
            }
        }
    }

    if (errorHeaderLine) {
        const colonIdx = errorHeaderLine.indexOf(':');
        if (colonIdx >= 0) {
            name = errorHeaderLine.slice(0, colonIdx).trim();
            message = errorHeaderLine.slice(colonIdx + 1).trim();
        } else {
            message = errorHeaderLine;
        }
    }

    const stackRegex = /at\s+(?:.+?\s+\()?(.*?):(\d+):(\d+)\)?/;
    for (const l of rawStack) {
        const match = l.match(stackRegex);
        if (match) {
            const filePath = match[1];
            // Filter out node_modules, Node/Bun internals, and anonymous wrappers
            if (
                !filePath.includes('node_modules') &&
                !filePath.startsWith('node:') &&
                !filePath.includes('bun:wrap') &&
                !filePath.includes('<anonymous>')
            ) {
                file = filePath;
                line = parseInt(match[2], 10);
                column = parseInt(match[3], 10);
                break;
            }
        }
    }

    // Fallback to the first available stack frame if no user-land frame matched
    if (!file && rawStack.length > 0) {
        const match = rawStack[0].match(stackRegex);
        if (match) {
            file = match[1];
            line = parseInt(match[2], 10);
            column = parseInt(match[3], 10);
        }
    }

    return { name, message, file, line, column, rawStack };
}

/**
 * ErrorOverlay widget which displays full-screen application crashes.
 */
export class ErrorOverlay implements RootWidget {
    readonly id: string;
    private _error: ParsedError;
    private _dirty = true;

    constructor(rawStderr: string) {
        this.id = `error_overlay_${Math.random().toString(36).substring(2, 7)}`;
        this._error = parseErrorStack(rawStderr);
    }

    get error(): ParsedError {
        return this._error;
    }

    getLayoutNode(): LayoutNode {
        return createLayoutNode(this.id, defaultStyle(), []);
    }

    get isDirty(): boolean {
        return this._dirty;
    }

    clearDirty(): void {
        this._dirty = false;
    }

    markDirty(): void {
        this._dirty = true;
    }

    render(screen: Screen): void {
        const { cols, rows } = screen;
        if (cols <= 0 || rows <= 0) return;

        // Clear screen with a consistent background
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                screen.setCell(x, y, {
                    char: ' ',
                    fg: { type: 'named', name: 'white' },
                    bg: { type: 'named', name: 'black' },
                });
            }
        }

        // 1. Draw top banner
        const bannerText = '  ❌ DEV-SERVER RUNTIME / COMPILE ERROR  ';
        screen.writeString(0, 0, bannerText.padEnd(cols, ' '), {
            fg: { type: 'named', name: 'white' },
            bg: { type: 'named', name: 'red' },
            bold: true,
        });

        // 2. Draw error header (Name: message)
        let currentLine = 2;
        screen.writeString(2, currentLine, `${this._error.name}:`, {
            fg: { type: 'named', name: 'red' },
            bold: true,
        });
        screen.writeString(2 + this._error.name.length + 2, currentLine, this._error.message, {
            fg: { type: 'named', name: 'white' },
            bold: true,
        });
        currentLine += 2;

        // 3. Draw primary error location
        if (this._error.file) {
            const locText = `Location: ${this._error.file}:${this._error.line ?? 0}:${this._error.column ?? 0}`;
            screen.writeString(2, currentLine, locText, {
                fg: { type: 'named', name: 'yellow' },
            });
            currentLine += 2;
        }

        // 4. Draw stack trace header
        screen.writeString(2, currentLine, 'Stack Trace:', {
            fg: { type: 'named', name: 'brightBlack' },
            underline: true,
        });
        currentLine += 1;

        // 5. Draw visible stack trace frames
        const maxTraceLines = rows - currentLine - 3;
        const visibleTrace = this._error.rawStack.slice(0, Math.max(0, maxTraceLines));
        for (const line of visibleTrace) {
            const isInternal =
                line.includes('node_modules') ||
                line.includes('node:') ||
                line.includes('bun:wrap') ||
                line.includes('<anonymous>');

            const style = isInternal
                ? { fg: { type: 'named' as const, name: 'brightBlack' as const } }
                : { fg: { type: 'named' as const, name: 'white' as const } };

            screen.writeString(4, currentLine, line.slice(0, cols - 6), style);
            currentLine++;
        }

        if (this._error.rawStack.length > visibleTrace.length) {
            screen.writeString(
                4,
                currentLine,
                `... and ${this._error.rawStack.length - visibleTrace.length} more frames`,
                { fg: { type: 'named', name: 'brightBlack' } }
            );
        }

        // 6. Draw bottom footer
        const footerText = '  🔄 Watching for changes... (Save a file to auto-reload)  ';
        screen.writeString(0, rows - 1, footerText.padEnd(cols, ' '), {
            fg: { type: 'named', name: 'black' },
            bg: { type: 'named', name: 'brightBlack' },
            bold: true,
        });
    }
}
