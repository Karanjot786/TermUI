// ─────────────────────────────────────────────────────
// Animations Tab — Spring physics & transition demos
// ─────────────────────────────────────────────────────

import { Widget, Box, Text, ProgressBar } from '@termuijs/widgets';
import { SPRING_PRESETS, stepSpring, type SpringState, type SpringConfig } from '@termuijs/motion';
import { type Screen, caps } from '@termuijs/core';

interface AnimDemo {
    name: string;
    preset: string;
    config: SpringConfig;
    state: SpringState;
    bar: ProgressBar;
}

export class AnimationsTab extends Widget {
    private _demos: AnimDemo[] = [];
    private _typewriterText: Text;
    private _typewriterFull = '  TermUI — The React/Next.js of CLI Apps. Build beautiful, interactive terminal UIs with TSX, hooks, themes, and animations.';
    private _typewriterPos = 0;
    private _pulseBar: ProgressBar;
    private _elapsed = 0;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1, gap: 1 });

        const header = new Text('🎬 Animations — Spring Physics & Transitions', {
            bold: true, fg: { type: 'named', name: 'green' }, height: 1,
        });

        // ── Spring demos ──
        const springBox = new Box({ border: 'round', borderColor: { type: 'named', name: 'green' }, flexGrow: 1, padding: 1, flexDirection: 'column', gap: 0 });
        springBox.addChild(new Text('🌀 Spring Presets (press Space to retrigger)', { height: 1, bold: true, fg: { type: 'named', name: 'green' } }));

        const presetNames = ['default', 'gentle', 'wobbly', 'stiff', 'slow', 'molasses'];
        const colors = ['cyan', 'green', 'yellow', 'magenta', 'blue', 'red'] as const;

        for (let i = 0; i < presetNames.length; i++) {
            const name = presetNames[i];
            const config = SPRING_PRESETS[name];
            const bar = new ProgressBar({ height: 1 }, {
                value: 0,
                fillColor: { type: 'named', name: colors[i] },
                showLabel: true,
            });
            const state: SpringState = { value: 0, velocity: 0, target: 1, done: false };
            this._demos.push({ name, preset: name, config, state, bar });

            const row = new Box({ flexDirection: 'row', height: 1, gap: 1 });
            row.addChild(new Text(`  ${name.padEnd(10)}`, { height: 1, width: 12, fg: { type: 'named', name: colors[i] } }));
            row.addChild(bar);
            springBox.addChild(row);
        }

        // ── Typewriter effect ──
        const typewriterBox = new Box({ border: 'single', borderColor: { type: 'named', name: 'cyan' }, height: 4, padding: 1, flexDirection: 'column' });
        typewriterBox.addChild(new Text('⌨️  Typewriter Effect', { height: 1, bold: true, fg: { type: 'named', name: 'cyan' } }));
        this._typewriterText = new Text('', { height: 1, fg: { type: 'named', name: 'white' } });
        typewriterBox.addChild(this._typewriterText);

        // ── Pulse ──
        const pulseBox = new Box({ flexDirection: 'row', height: 1, gap: 1 });
        pulseBox.addChild(new Text('  💓 Pulse:', { height: 1, width: 12, fg: { type: 'named', name: 'red' } }));
        this._pulseBar = new ProgressBar({ height: 1, flexGrow: 1 }, {
            value: 0.5,
            fillColor: { type: 'named', name: 'red' },
            showLabel: false,
        });
        pulseBox.addChild(this._pulseBar);

        const helpText = new Text(
            '  Space Retrigger Springs  •  6 spring presets  •  Real-time physics simulation',
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
        );

        // ── NO_MOTION fallback banner ──
        const noMotionBanner = new Text(
            '  ⚠  Animations disabled (NO_MOTION=1) — static values shown',
            { height: 1, fg: { type: 'named', name: 'yellow' }, bold: true },
        );

        this.addChild(header);
        this.addChild(springBox);
        this.addChild(typewriterBox);
        this.addChild(pulseBox);
        if (!caps.motion) {
            this.addChild(noMotionBanner);
        }
        this.addChild(helpText);
    }

    /** Reset all spring animations */
    retrigger(): void {
        for (const d of this._demos) {
            d.state = { value: 0, velocity: 0, target: 1, done: false };
        }
        this._typewriterPos = 0;
    }

    tick(dt: number): void {
        if (!caps.motion) return;

        this._elapsed += dt;
        const dtSec = dt / 1000;

        // Advance springs
        for (const d of this._demos) {
            if (!d.state.done) {
                d.state = stepSpring(d.state, d.config, dtSec);
                d.bar.setValue(Math.max(0, Math.min(1, d.state.value)));
            }
        }

        // Typewriter
        if (this._typewriterPos < this._typewriterFull.length) {
            this._typewriterPos += 0.5; // slow reveal
            this._typewriterText.setContent(this._typewriterFull.slice(0, Math.floor(this._typewriterPos)) + '█');
        } else {
            this._typewriterText.setContent(this._typewriterFull);
        }

        // Pulse
        const phase = (this._elapsed % 2000) / 2000;
        const intensity = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
        this._pulseBar.setValue(intensity);
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}
