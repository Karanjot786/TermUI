import { App, type KeyEvent, type Screen } from '@termuijs/core';
import { Widget, Box, Text, Center, ProgressBar } from '@termuijs/widgets';
import { transition } from '@termuijs/motion';

// ── Constants ──

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;


// ── Types ──

type Phase = 'work' | 'break';

// ── PomodoroApp Widget ──

class PomodoroApp extends Widget {
    private _phase: Phase = 'work';
    private _remaining: number = WORK_SECONDS;
    private _running: boolean = true;
    private _toastTimer: ReturnType<typeof setTimeout> | null = null;

    private _phaseLabel: Text;
    private _timerDisplay: Text;
    private _progressBar: ProgressBar;
    private _statusText: Text;
    private _toastText: Text;

    constructor() {
        super({
            flexDirection: 'column',
            width: 50,
            height: 16,
            border: 'double',
            borderColor: { type: 'named', name: 'cyan' },
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
            fg: { type: 'named', name: 'red' },
        }, { align: 'center' });

        this._timerDisplay = new Text('25:00', {
            bold: true,
            height: 1,
            fg: { type: 'named', name: 'white' },
        }, { align: 'center' });

        this._progressBar = new ProgressBar({}, { value: 0 });

        this._statusText = new Text('Status: Running', {
            height: 1,
            fg: { type: 'named', name: 'brightBlack' },
        }, { align: 'center' });

        this._toastText = new Text('', {
            height: 1,
            fg: { type: 'named', name: 'yellow' },
        }, { align: 'center' });

        const hintsText = new Text(
            '[space] pause/resume  [r] reset  [q] quit',
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
            { align: 'center' }
        );

        this.addChild(title);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this._phaseLabel);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this._timerDisplay);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this._progressBar);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this._statusText);
        this.addChild(this._toastText);
        this.addChild(new Box({ height: 1 }));
        this.addChild(hintsText);

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
                // Flash the timer white then fade back to phase color
                if (progress < 0.5) {
                    this._timerDisplay.style.fg = { type: 'named', name: 'white' };
                } else {
                    this._timerDisplay.style.fg = this._phase === 'work'
                     ? { type: 'named' as const, name: 'red' as const }
                     : { type: 'named' as const, name: 'green' as const };
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

        this._toastTimer = setTimeout(() => {
            this._toastText.setContent('');
            this._toastTimer = null;
            this.markDirty();
        }, 3000);
    }

    private _updateDisplay(): void {
        const phaseLabel = this._phase === 'work' ? 'Work' : 'Break';
        const phaseColor = this._phase === 'work'
            ? { type: 'named' as const, name: 'red' as const }
            : { type: 'named' as const, name: 'green' as const };

        this._phaseLabel.setContent(`-- ${phaseLabel} Phase --`);
        this._phaseLabel.style.fg = phaseColor;

        this._timerDisplay.setContent(this._formatTime(this._remaining));
        this._timerDisplay.style.fg = phaseColor;

        this._progressBar.setValue(this._elapsedFraction());
        this._progressBar.style.fg = phaseColor;

        const status = this._running ? 'Running' : 'Paused';
        this._statusText.setContent(`Status: ${status}`);

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