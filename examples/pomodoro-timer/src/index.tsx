import { App, type KeyEvent, type Screen, type Style, styleToCellAttrs, type Color, caps } from '@termuijs/core';
import { Widget, Box, Text, Center } from '@termuijs/widgets';
import { transition } from '@termuijs/motion';

// ── Constants ──

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

// ── Types ──

type Phase = 'work' | 'break';

// ── 3x5 Big Font Character Map ──

const BIG_DIGITS: Record<string, string[]> = {
    '0': [
        '███',
        '█ █',
        '█ █',
        '█ █',
        '███'
    ],
    '1': [
        ' █ ',
        ' █ ',
        ' █ ',
        ' █ ',
        ' █ '
    ],
    '2': [
        '███',
        '  █',
        '███',
        '█  ',
        '███'
    ],
    '3': [
        '███',
        '  █',
        '███',
        '  █',
        '███'
    ],
    '4': [
        '█ █',
        '█ █',
        '███',
        '  █',
        '  █'
    ],
    '5': [
        '███',
        '█  ',
        '███',
        '  █',
        '███'
    ],
    '6': [
        '███',
        '█  ',
        '███',
        '█ █',
        '███'
    ],
    '7': [
        '███',
        '  █',
        '  █',
        '  █',
        '  █'
    ],
    '8': [
        '███',
        '█ █',
        '███',
        '█ █',
        '███'
    ],
    '9': [
        '███',
        '█ █',
        '███',
        '  █',
        '███'
    ],
    ':': [
        '   ',
        ' █ ',
        '   ',
        ' █ ',
        '   '
    ]
};

function getBigDigitLines(char: string, useUnicode: boolean): string[] {
    const lines = BIG_DIGITS[char] || BIG_DIGITS['0'];
    return lines.map(line => useUnicode ? line : line.replace(/█/g, '#'));
}

// ── Dynamic Color Logic ──

function getDynamicColor(value: number): Color {
    if (value <= 0.25) {
        return { type: 'hex', hex: '#ef4444' }; // Red
    } else if (value <= 0.50) {
        return { type: 'hex', hex: '#f97316' }; // Orange
    } else if (value <= 0.75) {
        return { type: 'hex', hex: '#eab308' }; // Yellow
    } else {
        return { type: 'hex', hex: '#22c55e' }; // Green
    }
}

// ── BigTimer Widget ──

class BigTimer extends Widget {
    private _timeStr = '25:00';

    constructor(style: Partial<Style> = {}) {
        super({ height: 5, ...style });
    }

    setTime(timeStr: string): void {
        if (this._timeStr !== timeStr) {
            this._timeStr = timeStr;
            this.markDirty();
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const useUnicode = caps.unicode;

        const chars = this._timeStr.split('');
        const digitLines = chars.map(c => getBigDigitLines(c, useUnicode));

        // Join each of the 5 rows with 2 spaces between characters
        const lines: string[] = [];
        for (let row = 0; row < 5; row++) {
            lines.push(digitLines.map(dl => dl[row]).join('  '));
        }

        const digitsWidth = lines[0].length;
        const startX = x + Math.floor((width - digitsWidth) / 2);

        for (let row = 0; row < 5; row++) {
            screen.writeString(startX, y + row, lines[row], attrs);
        }
    }
}

// ── GradientProgressBar Widget ──

class GradientProgressBar extends Widget {
    private _value = 0;
    private _showLabel = true;

    constructor(style: Partial<Style> = {}, options: { showLabel?: boolean } = {}) {
        super({ height: 1, ...style });
        this._showLabel = options.showLabel ?? true;
    }

    setValue(value: number): void {
        const normalized = Math.max(0, Math.min(1, value));
        if (this._value !== normalized) {
            this._value = normalized;
            this.markDirty();
        }
    }

    get value(): number { return this._value; }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        const label = this._showLabel ? ` ${Math.round(this._value * 100)}%` : '';
        const barWidth = Math.max(0, width - label.length);
        const filled = this._value <= 0 ? 0 : Math.round(barWidth * this._value);
        const empty = barWidth - filled;

        // Perform linear interpolation for a smooth gradient from Red -> Orange -> Yellow -> Green
        const getColorAtFraction = (f: number): Color => {
            let r = 0, g = 0, b = 0;
            if (f <= 0.25) {
                // Red to Orange
                const t = f / 0.25;
                r = Math.round(239 + (249 - 239) * t);
                g = Math.round(68 + (115 - 68) * t);
                b = Math.round(68 + (22 - 68) * t);
            } else if (f <= 0.50) {
                // Orange to Yellow
                const t = (f - 0.25) / 0.25;
                r = Math.round(249 + (234 - 249) * t);
                g = Math.round(115 + (179 - 115) * t);
                b = Math.round(22 + (8 - 22) * t);
            } else if (f <= 0.75) {
                // Yellow to Green (interpolating from Yellow to #22c55e)
                const t = (f - 0.50) / 0.25;
                r = Math.round(234 + (34 - 234) * t);
                g = Math.round(179 + (197 - 179) * t);
                b = Math.round(8 + (94 - 8) * t);
            } else {
                // Green (interpolating from #22c55e to Emerald #10b981)
                const t = (f - 0.75) / 0.25;
                r = Math.round(34 + (16 - 34) * t);
                g = Math.round(197 + (185 - 197) * t);
                b = Math.round(94 + (129 - 94) * t);
            }
            return { type: 'rgb', r, g, b };
        };

        const useUnicode = caps.unicode;
        const fillChar = useUnicode ? '█' : '#';
        const emptyChar = useUnicode ? '░' : '-';

        // Render filled cells with horizontal gradient colors
        for (let i = 0; i < filled; i++) {
            const cellFraction = barWidth > 1 ? i / (barWidth - 1) : 0;
            const cellColor = getColorAtFraction(cellFraction);
            screen.setCell(x + i, y, { char: fillChar, ...attrs, fg: cellColor });
        }

        // Render empty background cells
        for (let i = 0; i < empty; i++) {
            screen.setCell(x + filled + i, y, { char: emptyChar, ...attrs, dim: true });
        }

        // Render label with the color matching the overall progress fraction
        if (label) {
            const labelColor = getColorAtFraction(this._value);
            screen.writeString(x + barWidth, y, label, { ...attrs, fg: labelColor, bold: true });
        }
    }
}

// ── StatusBadge Widget ──

class StatusBadge extends Widget {
    private _status: 'Running' | 'Paused' | 'Finished' = 'Running';

    constructor(style: Partial<Style> = {}) {
        super({ height: 1, ...style });
    }

    setStatus(status: 'Running' | 'Paused' | 'Finished'): void {
        if (this._status !== status) {
            this._status = status;
            this.markDirty();
        }
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        let bg: Color;
        const fg: Color = { type: 'named', name: 'black' };
        let text = '';

        switch (this._status) {
            case 'Running':
                bg = { type: 'hex', hex: '#22c55e' }; // Green background
                text = ' RUNNING ';
                break;
            case 'Paused':
                bg = { type: 'hex', hex: '#eab308' }; // Yellow background
                text = ' PAUSED ';
                break;
            case 'Finished':
                bg = { type: 'hex', hex: '#06b6d4' }; // Cyan background
                text = ' FINISHED ';
                break;
        }

        const startX = x + Math.floor((width - text.length) / 2);

        screen.writeString(startX, y, text, {
            ...attrs,
            bg,
            fg,
            bold: true,
        });
    }
}

// ── PomodoroApp Widget ──

class PomodoroApp extends Widget {
    private _phase: Phase = 'work';
    private _remaining: number = WORK_SECONDS;
    private _running: boolean = true;
    private _toastTimer: ReturnType<typeof setTimeout> | null = null;

    private _phaseLabel: Text;
    private _bigTimer: BigTimer;
    private _timeRemainingText: Text;
    private _progressBar: GradientProgressBar;
    private _statusBadge: StatusBadge;
    private _toastText: Text;

    constructor() {
        super({
            flexDirection: 'column',
            width: 54,
            height: 23,
            border: 'round',
            borderColor: { type: 'hex', hex: '#ef4444' },
            padding: 1,
        });

        const title = new Text(' TermUI Pomodoro Timer ', {
            bold: true,
            height: 1,
            fg: { type: 'named', name: 'cyan' },
        }, { align: 'center' });

        this._phaseLabel = new Text('-- Work Phase --', {
            bold: true,
            height: 1,
            fg: { type: 'hex', hex: '#ef4444' },
        }, { align: 'center' });

        this._bigTimer = new BigTimer({
            fg: { type: 'hex', hex: '#ef4444' },
        });

        this._timeRemainingText = new Text('Time Remaining: 25:00', {
            height: 1,
            fg: { type: 'named', name: 'brightBlack' },
        }, { align: 'center' });

        this._progressBar = new GradientProgressBar();

        this._statusBadge = new StatusBadge();

        this._toastText = new Text('', {
            height: 1,
            fg: { type: 'named', name: 'yellow' },
        }, { align: 'center' });

        const hintsBox = new Box({
            border: 'single',
            borderColor: { type: 'named', name: 'brightBlack' },
            padding: { left: 2, right: 2, top: 0, bottom: 0 },
            height: 3,
            width: '100%',
            flexDirection: 'column',
            justifyContent: 'center',
        });

        const hintsText = new Text(
            '[space] Pause/Resume  •  [r] Reset  •  [q] Quit',
            { height: 1, fg: { type: 'named', name: 'white' }, dim: true },
            { align: 'center' }
        );
        hintsBox.addChild(hintsText);

        this.addChild(title);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this._phaseLabel);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this._bigTimer);
        this.addChild(this._timeRemainingText);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this._progressBar);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this._statusBadge);
        this.addChild(this._toastText);
        this.addChild(new Box({ height: 1 }));
        this.addChild(hintsBox);

        this._updateDisplay();
    }

    // ── Helpers ──

    private _phaseDuration(): number {
        return this._phase === 'work' ? WORK_SECONDS : BREAK_SECONDS;
    }

    private _formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    private _elapsedFraction(): number {
        const total = this._phaseDuration();
        return (total - this._remaining) / total;
    }

    // ── Tick ──

    tick(): void {
        if (!this._running) return;
        if (this._remaining <= 1) {
            this._advancePhase();
            return;
        }
        this._remaining -= 1;
        this._updateDisplay();
    }

    private _advancePhase(): void {
        this._phase = this._phase === 'work' ? 'break' : 'work';
        this._remaining = this._phaseDuration();
        this._triggerPulse();
        this._showToast();
        this._updateDisplay();
    }

    private _triggerPulse(): void {
        transition({
            durationMs: 400,
            onFrame: (progress: number) => {
                // Flash the timer white then fade back to dynamic progress color
                if (progress < 0.5) {
                    this._bigTimer.style.fg = { type: 'named' as const, name: 'white' as const };
                } else {
                    const elapsed = this._elapsedFraction();
                    this._bigTimer.style.fg = getDynamicColor(elapsed);
                }
                this.markDirty();
            },
        });
    }

    private _showToast(): void {
        const label = this._phase === 'work' ? 'Work' : 'Break';
        const msg = `>> ${label} phase started! <<`;

        this._toastText.setContent(msg);
        this.markDirty();

        if (this._toastTimer !== null) {
            clearTimeout(this._toastTimer);
        }

        this._updateDisplay();

        this._toastTimer = setTimeout(() => {
            this._toastText.setContent('');
            this._toastTimer = null;
            this._updateDisplay();
        }, 3000);
    }

    private _updateDisplay(): void {
        const phaseLabel = this._phase === 'work' ? 'Work' : 'Break';
        const elapsed = this._elapsedFraction();
        const progressColor = getDynamicColor(elapsed);

        this._phaseLabel.setContent(`-- ${phaseLabel} Phase --`);
        this._phaseLabel.style.fg = progressColor;

        this._bigTimer.setTime(this._formatTime(this._remaining));
        this._bigTimer.style.fg = progressColor;

        this._timeRemainingText.setContent(`Time Remaining: ${this._formatTime(this._remaining)}`);
        this._timeRemainingText.style.fg = progressColor;

        this._progressBar.setValue(elapsed);

        let status: 'Running' | 'Paused' | 'Finished' = 'Running';
        if (this._toastTimer !== null) {
            status = 'Finished';
        } else if (!this._running) {
            status = 'Paused';
        }
        this._statusBadge.setStatus(status);

        // Update container border color
        this.style.borderColor = progressColor;

        this.markDirty();
    }

    // ── Key Handling ──

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }
        if (event.key === 'space') {
            this._running = !this._running;
            this._updateDisplay();
            return true;
        }
        if (event.key === 'r') {
            this._remaining = this._phaseDuration();
            this._updateDisplay();
            return true;
        }
        return true;
    }

    protected _renderSelf(_screen: Screen): void {
        // Child widgets handle rendering
    }
}

// ── Application Mounting ──

async function main() {
    const pomodoroApp = new PomodoroApp();
    const centerLayout = new Center({}, { horizontal: true, vertical: true });
    centerLayout.addChild(pomodoroApp);

    const app = new App(centerLayout, {
        fullscreen: true,
        title: 'Pomodoro Timer',
        fps: 30,
    });

    const tickInterval = setInterval(() => {
        pomodoroApp.tick();
        app.requestRender();
    }, 1000);

    app.events.on('key', (event) => {
        const shouldContinue = pomodoroApp.handleKey(event);
        if (!shouldContinue) {
            clearInterval(tickInterval);
            app.exit(0);
        }
        app.requestRender();
    });

    const exitCode = await app.mount();
    clearInterval(tickInterval);
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Pomodoro timer error:', err);
    process.exit(1);
});