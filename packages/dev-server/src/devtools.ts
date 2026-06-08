// ─────────────────────────────────────────────────────
// DevTools Panel — widget tree inspector, perf metrics
// ─────────────────────────────────────────────────────

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
    private _tab: 'tree' | 'styles' | 'perf' | 'events' = 'tree';
    private _widgetTree: WidgetNode | null = null;
    private _metrics: PerfMetrics = { renderTimeMs: 0, widgetCount: 0, lastRenderAt: 0, fps: 0, memoryMB: 0 };
    private _eventLog: Array<{ time: number; type: string; detail: string }> = [];
    private _maxEvents = 100;
    private _renderTimes: number[] = [];
    private _frameRows: string[] = [];

    get visible(): boolean { return this._visible; }
    toggle(): void { this._visible = !this._visible; }
    show(): void { this._visible = true; }
    hide(): void { this._visible = false; }

    get activeTab(): string { return this._tab; }
    setTab(tab: 'tree' | 'styles' | 'perf' | 'events'): void { this._tab = tab; }

    /** Update widget tree snapshot */
    updateTree(root: WidgetNode): void { this._widgetTree = root; }

    /** Record a render cycle */
    recordRender(timeMs: number, widgetCount: number): void {
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
        const tabBar = `  [${this._tab === 'tree' ? '▸' : ' '}Tree]  [${this._tab === 'styles' ? '▸' : ' '}Styles]  [${this._tab === 'perf' ? '▸' : ' '}Perf]  [${this._tab === 'events' ? '▸' : ' '}Events]`;
        lines.push('─'.repeat(width));
        lines.push('  🔧 DevTools (F12 to close)');
        lines.push(tabBar);
        lines.push('─'.repeat(width));

        switch (this._tab) {
            case 'tree':
                if (this._widgetTree) this._renderTree(this._widgetTree, 0, lines, height - 5);
                else lines.push('  No widget tree data');
                break;
            case 'styles':
                lines.push('  Style inspector — select a widget in the tree');
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
