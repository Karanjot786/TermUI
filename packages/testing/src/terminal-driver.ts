// ─────────────────────────────────────────────────────
// @termuijs/testing — VT100 / ANSI Terminal Driver
// ─────────────────────────────────────────────────────

export interface TerminalCell {
    char: string;
    fg?: string;
    bg?: string;
    bold?: boolean;
    dim?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export interface TerminalTestDriverOptions {
    width?: number;
    height?: number;
}

const COLOR_NAMES: Record<number, string> = {
    30: 'black',
    31: 'red',
    32: 'green',
    33: 'yellow',
    34: 'blue',
    35: 'magenta',
    36: 'cyan',
    37: 'white',
    90: 'brightBlack',
    91: 'brightRed',
    92: 'brightGreen',
    93: 'brightYellow',
    94: 'brightBlue',
    95: 'brightMagenta',
    96: 'brightCyan',
    97: 'brightWhite',
};

const BG_COLOR_NAMES: Record<number, string> = {
    40: 'black',
    41: 'red',
    42: 'green',
    43: 'yellow',
    44: 'blue',
    45: 'magenta',
    46: 'cyan',
    47: 'white',
    100: 'brightBlack',
    101: 'brightRed',
    102: 'brightGreen',
    103: 'brightYellow',
    104: 'brightBlue',
    105: 'brightMagenta',
    106: 'brightCyan',
    107: 'brightWhite',
};

export class TerminalTestDriver {
    readonly width: number;
    readonly height: number;
    private _grid: TerminalCell[][];
    private _cursorX = 0;
    private _cursorY = 0;

    private _currentFg?: string;
    private _currentBg?: string;
    private _currentBold = false;
    private _currentDim = false;
    private _currentItalic = false;
    private _currentUnderline = false;

    constructor(options: TerminalTestDriverOptions = {}) {
        this.width = options.width ?? 80;
        this.height = options.height ?? 24;
        this._grid = this._createEmptyGrid();
    }

    get cursorX(): number {
        return this._cursorX;
    }

    get cursorY(): number {
        return this._cursorY;
    }

    clear(): void {
        this._grid = this._createEmptyGrid();
        this._cursorX = 0;
        this._cursorY = 0;
        this._resetStyle();
    }

    getCell(x: number, y: number): TerminalCell {
        if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
            return { char: ' ' };
        }
        return this._grid[y][x];
    }

    getLine(y: number): string {
        if (y < 0 || y >= this.height) return '';
        return this._grid[y].map((c) => c.char).join('').trimEnd();
    }

    getText(): string {
        return this._grid.map((row) => row.map((c) => c.char).join('').trimEnd()).join('\n').trimEnd();
    }

    assertRegion(x: number, y: number, width: number, height: number, expectedText: string): void {
        const expectedLines = expectedText.split('\n');
        for (let r = 0; r < height; r++) {
            const actualLine = this.getLine(y + r).slice(x, x + width).trimEnd();
            const expLine = (expectedLines[r] ?? '').trimEnd();
            if (actualLine !== expLine) {
                throw new Error(
                    `Terminal assertRegion failed at row ${y + r}:\nExpected: "${expLine}"\nReceived: "${actualLine}"`
                );
            }
        }
    }

    write(data: string): void {
        let i = 0;
        while (i < data.length) {
            const char = data[i];

            if (char === '\x1b') {
                const matchCSI = data.slice(i).match(/^\x1b\[([0-9;]*)([a-zA-Z])/);
                if (matchCSI) {
                    const args = matchCSI[1] ? matchCSI[1].split(';').map(Number) : [];
                    const cmd = matchCSI[2];
                    this._handleCSI(cmd, args);
                    i += matchCSI[0].length;
                    continue;
                }

                if (data.slice(i, i + 2) === '\x1bH') {
                    this._cursorX = 0;
                    this._cursorY = 0;
                    i += 2;
                    continue;
                }

                i++;
                continue;
            }

            if (char === '\n') {
                this._cursorY++;
                if (this._cursorY >= this.height) this._cursorY = this.height - 1;
                this._cursorX = 0;
                i++;
                continue;
            }

            if (char === '\r') {
                this._cursorX = 0;
                i++;
                continue;
            }

            if (char === '\t') {
                this._cursorX = Math.min(this.width - 1, this._cursorX + 4);
                i++;
                continue;
            }

            if (
                this._cursorY >= 0 &&
                this._cursorY < this.height &&
                this._cursorX >= 0 &&
                this._cursorX < this.width
            ) {
                this._grid[this._cursorY][this._cursorX] = {
                    char,
                    fg: this._currentFg,
                    bg: this._currentBg,
                    bold: this._currentBold || undefined,
                    dim: this._currentDim || undefined,
                    italic: this._currentItalic || undefined,
                    underline: this._currentUnderline || undefined,
                };
                this._cursorX++;
                if (this._cursorX >= this.width) {
                    this._cursorX = 0;
                    this._cursorY = Math.min(this.height - 1, this._cursorY + 1);
                }
            }

            i++;
        }
    }

    private _handleCSI(cmd: string, args: number[]): void {
        switch (cmd) {
            case 'm':
                if (args.length === 0 || (args.length === 1 && args[0] === 0)) {
                    this._resetStyle();
                    break;
                }
                for (const arg of args) {
                    if (arg === 0) this._resetStyle();
                    else if (arg === 1) this._currentBold = true;
                    else if (arg === 2) this._currentDim = true;
                    else if (arg === 3) this._currentItalic = true;
                    else if (arg === 4) this._currentUnderline = true;
                    else if (arg === 22) {
                        this._currentBold = false;
                        this._currentDim = false;
                    } else if (arg === 23) this._currentItalic = false;
                    else if (arg === 24) this._currentUnderline = false;
                    else if (arg === 39) this._currentFg = undefined;
                    else if (arg === 49) this._currentBg = undefined;
                    else if (COLOR_NAMES[arg]) this._currentFg = COLOR_NAMES[arg];
                    else if (BG_COLOR_NAMES[arg]) this._currentBg = BG_COLOR_NAMES[arg];
                }
                break;
            case 'H':
            case 'f': {
                const row = (args[0] ?? 1) - 1;
                const col = (args[1] ?? 1) - 1;
                this._cursorY = Math.max(0, Math.min(this.height - 1, row));
                this._cursorX = Math.max(0, Math.min(this.width - 1, col));
                break;
            }
            case 'J':
                if (args[0] === 2 || args.length === 0) {
                    this.clear();
                }
                break;
            case 'K':
                if (this._cursorY >= 0 && this._cursorY < this.height) {
                    for (let x = this._cursorX; x < this.width; x++) {
                        this._grid[this._cursorY][x] = { char: ' ' };
                    }
                }
                break;
        }
    }

    private _resetStyle(): void {
        this._currentFg = undefined;
        this._currentBg = undefined;
        this._currentBold = false;
        this._currentDim = false;
        this._currentItalic = false;
        this._currentUnderline = false;
    }

    private _createEmptyGrid(): TerminalCell[][] {
        return Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => ({ char: ' ' }))
        );
    }
}
