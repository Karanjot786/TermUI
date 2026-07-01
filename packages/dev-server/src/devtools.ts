// ─────────────────────────────────────────────────────
// DevTools Panel — widget tree inspector, perf metrics
// ─────────────────────────────────────────────────────
import { type Screen, type Cell, type Color, caps } from '@termuijs/core';


export interface WidgetNode {
    type: string;
    id?: string;
    rect: { x: number; y: number; width: number; height: number };
    style?: Record<string, unknown>;
    children: WidgetNode[];
}

export interface PerfMetrics {
    renderTimeMs: number;
    widgetCount: number;
    lastRenderAt: number;
    fps: number;
    memoryMB: number;
}

export class DevTools {
    private _visible = false;
    private _tab: 'tree' | 'perf' | 'events' = 'tree';
    private _widgetTree: WidgetNode | null = null;
    private _metrics: PerfMetrics = { renderTimeMs: 0, widgetCount: 0, lastRenderAt: 0, fps: 0, memoryMB: 0 };
    private _eventLog: Array<{ time: number; type: string; detail: string }> = [];
    private _maxEvents = 100;
    private _renderTimes: number[] = [];
    private _frameRows: string[] = [];
    
    public lastHoverWidgetId: string | null = null;
    public lastHoverCells: { x: number; y: number; cell: Cell }[] = [];

    get visible(): boolean { return this._visible; }
    toggle(): void { this._visible = !this._visible; }
    show(): void { this._visible = true; }
    hide(): void { this._visible = false; }

    get activeTab(): string { return this._tab; }
    setTab(tab: 'tree' | 'perf' | 'events'): void { this._tab = tab; }

    /** Update widget tree snapshot */
    updateTree(root: WidgetNode): void { this._widgetTree = root; }
    get widgetTree(): WidgetNode | null { return this._widgetTree; }

    /** Record a render cycle */
    recordRender(timeMs: number, widgetCount: number): void {
        this.lastHoverCells = []; // Clear saved cells so they aren't restored over fresh screen content
        const now = Date.now();
        this._renderTimes.push(now);
        // Keep last 60 render timestamps for FPS calculation
        while (this._renderTimes.length > 60) this._renderTimes.shift();
        const elapsed = this._renderTimes.length > 1
            ? (this._renderTimes[this._renderTimes.length - 1] - this._renderTimes[0]) / 1000
            : 1;
        const fps = elapsed > 0 ? this._renderTimes.length / elapsed : 0;

        this._metrics = {
            renderTimeMs: timeMs,
            widgetCount,
            lastRenderAt: now,
            fps: Math.round(fps * 10) / 10,
            memoryMB: Math.round((process.memoryUsage?.().heapUsed ?? 0) / 1024 / 1024 * 10) / 10,
        };
    }

    /** Log an event */
    logEvent(type: string, detail: string): void {
        this._eventLog.push({ time: Date.now(), type, detail });
        while (this._eventLog.length > this._maxEvents) this._eventLog.shift();
    }

    /** Store the latest rendered frame rows (a defensive copy is taken so
     *  subsequent mutations of the caller's array do not affect the stored frame). */
    setFrame(rows: string[]): void {
        this._frameRows = rows.slice();
    }

    /** Capture the stored frame, trimmed and joined with newlines. Returns empty string if no frame has been stored. */
    captureFrame(): string {
        if (this._frameRows.length === 0) return '';
        
        // Trim trailing blank rows
        let endIndex = this._frameRows.length;
        while (endIndex > 0 && this._frameRows[endIndex - 1].trim() === '') {
            endIndex--;
        }
        
        const trimmedRows = this._frameRows.slice(0, endIndex);
        return trimmedRows.join('\n');
    }

    /** Generate a deterministic screenshot filename containing 'termui-frame' and '.txt' */
    screenshotFilename(now?: number): string {
        const timestamp = now ?? Date.now();
        return `termui-frame-${timestamp}.txt`;
    }

    /** Get displayable panel content (plain text for rendering) */
    getPanel(width: number, height: number): string[] {
        const lines: string[] = [];
        const tabBar = `  [${this._tab === 'tree' ? '▸' : ' '}Tree]  [${this._tab === 'perf' ? '▸' : ' '}Perf]  [${this._tab === 'events' ? '▸' : ' '}Events]`;
        lines.push('─'.repeat(width));
        lines.push('  🔧 DevTools (F12 to close)');
        lines.push(tabBar);
        lines.push('─'.repeat(width));

        switch (this._tab) {
            case 'tree':
                if (this._widgetTree) this._renderTree(this._widgetTree, 0, lines, height - 5);
                else lines.push('  No widget tree data');
                break;
            case 'perf':
                lines.push(`  Render: ${this._metrics.renderTimeMs.toFixed(1)}ms`);
                lines.push(`  FPS:    ${this._metrics.fps}`);
                lines.push(`  Widgets: ${this._metrics.widgetCount}`);
                lines.push(`  Memory: ${this._metrics.memoryMB} MB`);
                break;
            case 'events':
                const recent = this._eventLog.slice(-Math.max(0, height - 6));
                for (const evt of recent) {
                    const time = new Date(evt.time).toISOString().slice(11, 23);
                    lines.push(`  ${time} [${evt.type}] ${evt.detail}`.slice(0, width));
                }
                if (recent.length === 0) lines.push('  No events logged yet');
                break;
        }

        return lines.slice(0, height);
    }

    private _renderTree(node: WidgetNode, depth: number, lines: string[], maxLines: number): void {
        if (lines.length >= maxLines) return;
        const indent = '  '.repeat(depth + 1);
        const rect = `(${node.rect.x},${node.rect.y} ${node.rect.width}×${node.rect.height})`;
        const extra = this._widgetTypeInfo(node);
        lines.push(`${indent}${node.type}${node.id ? '#' + node.id : ''} ${rect}${extra}`);
        for (const child of node.children) {
            this._renderTree(child, depth + 1, lines, maxLines);
        }
    }

    /**
     * Return extra inspector info for known widget types.
     * The node's `type` field matches the widget constructor name.
     * `style` may carry widget-specific metadata forwarded via IPC.
     */
    private _widgetTypeInfo(node: WidgetNode): string {
        const s = node.style ?? {};
        switch (node.type) {
            case 'Grid': {
                const cols = s['columns'] != null ? `cols=${s['columns']}` : '';
                const rows = s['rows'] != null ? `rows=${s['rows']}` : '';
                const gap  = s['gap']  != null ? `gap=${s['gap']}`   : '';
                const info = [cols, rows, gap].filter(Boolean).join(' ');
                return info ? `  [Grid: ${info}]` : '  [Grid]';
            }
            case 'Skeleton': {
                const animated = s['animated'] !== false ? 'animated' : 'static';
                const lines_   = s['lines'] != null ? `lines=${s['lines']}` : '';
                const info = [animated, lines_].filter(Boolean).join(' ');
                return `  [Skeleton: ${info}]`;
            }
            case 'Tree': {
                const depth_   = s['depth']    != null ? `depth=${s['depth']}`   : '';
                const expanded = s['expanded'] != null ? `expanded=${s['expanded']}` : '';
                const info = [depth_, expanded].filter(Boolean).join(' ');
                return info ? `  [Tree: ${info}]` : '  [Tree]';
            }
            case 'CommandPalette': {
                const items = s['itemCount'] != null ? `items=${s['itemCount']}` : '';
                const open  = s['open'] != null ? (s['open'] ? 'open' : 'closed') : '';
                const info  = [items, open].filter(Boolean).join(' ');
                return info ? `  [CommandPalette: ${info}]` : '  [CommandPalette]';
            }
            case 'Toast': {
                const variant = s['variant'] != null ? String(s['variant']) : '';
                const duration = s['duration'] != null ? `${s['duration']}ms` : '';
                const info = [variant, duration].filter(Boolean).join(' ');
                return info ? `  [Toast: ${info}]` : '  [Toast]';
            }
            default:
                return '';
        }
    }
}

export function getWidgetRect(root: WidgetNode | null, id: string): { x: number; y: number; width: number; height: number; } | null {
    if (!root) return null;
    if (root.id === id) return root.rect;
    for (const child of root.children) {
        const found = getWidgetRect(child, id);
        if (found) return found;
    }
    return null;
}

export function renderDebugRect(screen: Screen, rect: { x: number; y: number; width: number; height: number; }): { x: number; y: number; cell: Cell }[] {
    const color: Color = { type: 'hex', hex: '#FF00FF' };
    const bg: Color = { type: 'none' };
    const savedCells: { x: number; y: number; cell: Cell }[] = [];
    const savedMap = new Set<string>();

    const saveCell = (x: number, y: number) => {
        const key = `${x},${y}`;
        if (savedMap.has(key)) return;
        savedMap.add(key);
        const cell = screen.getCell(x, y);
        if (cell) {
            savedCells.push({ x, y, cell: { ...cell } });
        }
    };

    const hBar = caps.unicode ? '─' : '-';
    const vBar = caps.unicode ? '│' : '|';
    const tl = caps.unicode ? '┌' : '+';
    const tr = caps.unicode ? '┐' : '+';
    const bl = caps.unicode ? '└' : '+';
    const br = caps.unicode ? '┘' : '+';

    // Draw top & bottom borders safely
    for (let x = rect.x; x < rect.x + rect.width; x++) {
        saveCell(x, rect.y);
        screen.setCell(x, rect.y, { char: hBar, fg: color, bg });
        saveCell(x, rect.y + rect.height - 1);
        screen.setCell(x, rect.y + rect.height - 1, { char: hBar, fg: color, bg });
    }
    // Draw left & right borders safely
    for (let y = rect.y; y < rect.y + rect.height; y++) {
        saveCell(rect.x, y);
        screen.setCell(rect.x, y, { char: vBar, fg: color, bg });
        saveCell(rect.x + rect.width - 1, y);
        screen.setCell(rect.x + rect.width - 1, y, { char: vBar, fg: color, bg });
    }
    
    // Draw corners
    saveCell(rect.x, rect.y);
    screen.setCell(rect.x, rect.y, { char: tl, fg: color, bg });
    saveCell(rect.x + rect.width - 1, rect.y);
    screen.setCell(rect.x + rect.width - 1, rect.y, { char: tr, fg: color, bg });
    saveCell(rect.x, rect.y + rect.height - 1);
    screen.setCell(rect.x, rect.y + rect.height - 1, { char: bl, fg: color, bg });
    saveCell(rect.x + rect.width - 1, rect.y + rect.height - 1);
    screen.setCell(rect.x + rect.width - 1, rect.y + rect.height - 1, { char: br, fg: color, bg });

    return savedCells;
}

export function handleDevToolsHover(x: number, y: number, screen: Screen, devtools: DevTools): void {
    const cell = screen.getCell(x, y);
    const newId = (cell && cell.debugWidgetId) ? cell.debugWidgetId : null;

    if (newId === devtools.lastHoverWidgetId) return;

    // Restore old cells
    for (const saved of devtools.lastHoverCells) {
        screen.setCell(saved.x, saved.y, saved.cell);
    }
    devtools.lastHoverCells = [];
    devtools.lastHoverWidgetId = newId;

    if (newId && devtools.widgetTree) {
        const rect = getWidgetRect(devtools.widgetTree, newId);
        if (rect) {
            devtools.lastHoverCells = renderDebugRect(screen, rect);
        }
    }
}
