import { type Screen, type Style, type Color, styleToCellAttrs, truncate, caps } from '@termuijs/core';
import { Widget } from '@termuijs/widgets';

export interface ParsedLog {
    raw: string;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    service: string;
    message: string;
}

export function parseLogString(log: string): ParsedLog {
    // Format: "[HH:MM:SS.mmm] [LEVEL] service: message"
    const match = log.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+([^:]+):\s+(.*)$/);
    if (match) {
        return {
            raw: log,
            timestamp: match[1],
            level: (match[2].toUpperCase() as any) || 'INFO',
            service: match[3],
            message: match[4]
        };
    }
    return {
        raw: log,
        timestamp: new Date().toISOString().slice(11, 23),
        level: 'INFO',
        service: 'system',
        message: log
    };
}

const SERVICE_COLORS: Record<string, string> = {
    'auth-service': '#f472b6',  // pink/magenta
    'db-pool': '#60a5fa',       // blue
    'gateway': '#2dd4bf',       // teal
    'cache-manager': '#facc15',  // yellow
    'payment-api': '#fb923c',   // orange
};

export class LogTable extends Widget {
    focusable = true;
    
    private _rawLines: string[] = [];
    private _parsedLogs: ParsedLog[] = [];
    private _scrollOffset = 0;
    private _autoScroll = true;
    private _selectedIndex = -1;

    constructor(style: Partial<Style> = {}) {
        super({
            flexGrow: 1,
            border: 'single',
            borderColor: { type: 'hex', hex: '#2c3143' },
            bg: { type: 'hex', hex: '#0c0d12' },
            ...style
        });
    }

    setLines(lines: string[]): void {
        this._rawLines = lines;
        this._parsedLogs = lines.map(parseLogString);
        
        // Adjust selectedIndex if it goes out of bounds
        if (this._selectedIndex >= this._parsedLogs.length) {
            this._selectedIndex = this._parsedLogs.length - 1;
        }

        if (this._autoScroll) {
            this.scrollToBottom();
        } else {
            this._clampScroll();
            this.markDirty();
        }
    }

    getLines(): string[] {
        return this._rawLines;
    }

    setAutoScroll(val: boolean): void {
        this._autoScroll = val;
        if (val) {
            this.scrollToBottom();
        } else {
            this.markDirty();
        }
    }

    getAutoScroll(): boolean {
        return this._autoScroll;
    }

    scrollToBottom(): void {
        const rect = this._getContentRect();
        const visibleLines = Math.max(1, rect.height);
        this._scrollOffset = Math.max(0, this._parsedLogs.length - visibleLines);
        this._autoScroll = true;
        this.markDirty();
    }

    scrollUp(n = 1): void {
        this._scrollOffset = Math.max(0, this._scrollOffset - n);
        this._autoScroll = false;
        this.markDirty();
    }

    scrollDown(n = 1): void {
        const rect = this._getContentRect();
        const visibleLines = Math.max(1, rect.height);
        const maxScroll = Math.max(0, this._parsedLogs.length - visibleLines);
        this._scrollOffset = Math.min(maxScroll, this._scrollOffset + n);
        
        if (this._scrollOffset >= maxScroll) {
            this._autoScroll = true;
        }
        this.markDirty();
    }

    moveSelectionUp(): void {
        this._autoScroll = false;
        if (this._selectedIndex === -1) {
            this._selectedIndex = this._parsedLogs.length - 1;
        } else {
            this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        }
        this._keepSelectionVisible();
        this.markDirty();
    }

    moveSelectionDown(): void {
        if (this._selectedIndex === -1) {
            this._selectedIndex = 0;
        } else {
            this._selectedIndex = Math.min(this._parsedLogs.length - 1, this._selectedIndex + 1);
        }
        
        const rect = this._getContentRect();
        const visibleLines = Math.max(1, rect.height);
        const maxScroll = Math.max(0, this._parsedLogs.length - visibleLines);
        
        this._keepSelectionVisible();
        
        // If we selected the very last row, re-enable auto-scroll
        if (this._selectedIndex === this._parsedLogs.length - 1 && this._scrollOffset >= maxScroll) {
            this._autoScroll = true;
        }
        this.markDirty();
    }

    private _keepSelectionVisible(): void {
        if (this._selectedIndex === -1) return;
        const rect = this._getContentRect();
        const visibleLines = Math.max(1, rect.height);
        
        if (this._selectedIndex < this._scrollOffset) {
            this._scrollOffset = this._selectedIndex;
        } else if (this._selectedIndex >= this._scrollOffset + visibleLines) {
            this._scrollOffset = this._selectedIndex - visibleLines + 1;
        }
    }

    private _clampScroll(): void {
        const rect = this._getContentRect();
        const visibleLines = Math.max(1, rect.height);
        const maxScroll = Math.max(0, this._parsedLogs.length - visibleLines);
        this._scrollOffset = Math.max(0, Math.min(this._scrollOffset, maxScroll));
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const visibleLogs = this._parsedLogs.slice(this._scrollOffset, this._scrollOffset + height);

        for (let i = 0; i < Math.min(visibleLogs.length, height); i++) {
            const logIdx = this._scrollOffset + i;
            const log = visibleLogs[i];
            const isSelected = logIdx === this._selectedIndex;
            const isStripe = logIdx % 2 === 1;

            const rowBg = isSelected
                ? { type: 'hex' as const, hex: '#2c3143' } // Highlight background
                : isStripe
                    ? { type: 'hex' as const, hex: '#11131c' } // Zebra stripe background
                    : attrs.bg;

            const screenY = y + i;

            // Clear row background
            for (let c = 0; c < width; c++) {
                screen.setCell(x + c, screenY, { char: ' ', bg: rowBg });
            }

            let cx = x;

            // 1. Timestamp (muted gray)
            const timeStr = ` ${log.timestamp} `;
            screen.writeString(cx, screenY, timeStr, { fg: { type: 'hex', hex: '#7a8c9e' }, bg: rowBg });
            cx += 14;

            // 2. Level Badge
            let badgeFg: Color = { type: 'named', name: 'black' };
            let badgeBg: Color = { type: 'hex', hex: '#6b7280' };
            if (log.level === 'INFO') badgeBg = { type: 'hex', hex: '#10b981' };
            if (log.level === 'WARN') badgeBg = { type: 'hex', hex: '#f59e0b' };
            if (log.level === 'ERROR') badgeBg = { type: 'hex', hex: '#ef4444' };
            if (log.level === 'DEBUG') badgeBg = { type: 'hex', hex: '#3b82f6' };

            const levelStr = ` ${log.level.padEnd(5)} `;
            screen.writeString(cx, screenY, levelStr, { fg: badgeFg, bg: badgeBg, bold: true });
            cx += 9;

            // Separator
            screen.writeString(cx, screenY, ' ', { bg: rowBg });
            cx += 1;

            // 3. Service Tag (cyan or custom mapping)
            const serviceColor = SERVICE_COLORS[log.service] ?? '#ffffff';
            const serviceStr = `[${log.service}]`.padEnd(16).slice(0, 16);
            screen.writeString(cx, screenY, serviceStr, { fg: { type: 'hex', hex: serviceColor }, bg: rowBg, bold: true });
            cx += 17;

            // 4. Log Message
            const msgWidth = width - (cx - x);
            if (msgWidth > 0) {
                // Monospace message string
                const truncatedMsg = truncate(log.message, msgWidth);
                screen.writeString(cx, screenY, truncatedMsg, { fg: { type: 'hex', hex: '#e2e8f0' }, bg: rowBg });
            }
        }

        // Render floating "JUMP TO LATEST" button if scrolled up
        if (!this._autoScroll && this._parsedLogs.length > height) {
            const label = " ▲ JUMP TO LATEST ";
            const labelLen = label.length;
            const btnX = x + width - labelLen - 2;
            const btnY = y + height - 1;

            if (btnX > x && btnY >= y) {
                // Render button overlay (cyan outline and text)
                screen.writeString(btnX, btnY, label, {
                    fg: { type: 'hex', hex: '#06b6d4' },
                    bg: { type: 'hex', hex: '#11131c' },
                    bold: true,
                    underline: true
                });
            }
        }
    }
}
