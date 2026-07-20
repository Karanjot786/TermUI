// ─────────────────────────────────────────────────────
// Sprint 2 Tab — ErrorBoundary, useKeymap, Named Themes,
//               writeClipboard, Skeleton, Grid, NotificationCenter
// ─────────────────────────────────────────────────────

import { Widget, Box, Text, Skeleton, Grid } from '@termuijs/widgets';
import { NotificationCenter, notifications } from '@termuijs/ui';
import { writeClipboard, caps } from '@termuijs/core';
import { draculaTheme, nordTheme } from '@termuijs/tss';
import type { Screen } from '@termuijs/core';

// ── Sprint2Tab ────────────────────────────────────────

export class Sprint2Tab extends Widget {
    private _notifCenter: NotificationCenter;
    private _notifCountText: Text;
    private _notifCount = 0;
    private _clipboardStatus: Text;
    private _skeletons: Skeleton[] = [];
    private _skeletonLoaded = false;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1 });

        // Header
        const header = new Text('Sprint 2 — ErrorBoundary · useKeymap · Named Themes · Clipboard · Skeleton · Grid · Notifications', {
            bold: true,
            fg: { type: 'named', name: 'magenta' },
            height: 1,
        });

        const hint = new Text(
            '  n Push notification  •  c Copy to clipboard  •  l Load skeleton content',
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
        );

        // ── Row 1: Named Themes ────────────────────────
        const themeRow = new Box({ flexDirection: 'row', gap: 1, height: 8 });

        const draculaBox = new Box({
            border: 'single',
            borderColor: { type: 'hex', hex: draculaTheme.primary },
            flexGrow: 1,
            flexDirection: 'column',
            padding: 1,
        });
        draculaBox.addChild(new Text('Dracula Theme', {
            height: 1, bold: true, fg: { type: 'hex', hex: draculaTheme.primary },
        }));
        const draculaTokens: Array<keyof typeof draculaTheme> = ['bg', 'fg', 'primary', 'error', 'success'];
        for (const key of draculaTokens) {
            draculaBox.addChild(new Text(
                `  ${key.padEnd(10)} ${draculaTheme[key]}`,
                { height: 1, fg: { type: 'hex', hex: draculaTheme[key] } },
            ));
        }

        const nordBox = new Box({
            border: 'single',
            borderColor: { type: 'hex', hex: nordTheme.primary },
            flexGrow: 1,
            flexDirection: 'column',
            padding: 1,
        });
        nordBox.addChild(new Text('Nord Theme', {
            height: 1, bold: true, fg: { type: 'hex', hex: nordTheme.primary },
        }));
        const nordTokens: Array<keyof typeof nordTheme> = ['bg', 'fg', 'primary', 'error', 'success'];
        for (const key of nordTokens) {
            nordBox.addChild(new Text(
                `  ${key.padEnd(10)} ${nordTheme[key]}`,
                { height: 1, fg: { type: 'hex', hex: nordTheme[key] } },
            ));
        }

        themeRow.addChild(draculaBox);
        themeRow.addChild(nordBox);

        // ── Row 2: Clipboard + ErrorBoundary/useKeymap info ──
        const infoRow = new Box({ flexDirection: 'row', gap: 1, height: 6 });

        const clipBox = new Box({
            border: 'single',
            borderColor: { type: 'named', name: 'cyan' },
            flexGrow: 1,
            flexDirection: 'column',
            padding: 1,
        });
        clipBox.addChild(new Text('Clipboard (OSC 52)', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        }));
        clipBox.addChild(new Text(
            `  Press [c] to copy "Hello TermUI!" to clipboard`,
            { height: 1, fg: { type: 'named', name: 'white' } },
        ));
        this._clipboardStatus = new Text(
            caps.unicode ? '  Status: waiting…' : '  Status: waiting',
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
        );
        clipBox.addChild(this._clipboardStatus);

        const featureBox = new Box({
            border: 'single',
            borderColor: { type: 'named', name: 'yellow' },
            flexGrow: 1,
            flexDirection: 'column',
            padding: 1,
        });
        featureBox.addChild(new Text('JSX Features (Sprint 2)', {
            height: 1, bold: true, fg: { type: 'named', name: 'yellow' },
        }));
        featureBox.addChild(new Text('  ErrorBoundary — wraps subtrees, catches render errors', {
            height: 1, fg: { type: 'named', name: 'white' },
        }));
        featureBox.addChild(new Text('  useKeymap([{key,ctrl,action}]) — declarative keybindings', {
            height: 1, fg: { type: 'named', name: 'white' },
        }));
        featureBox.addChild(new Text('  useMotion() — returns {reduced:bool} from caps.motion', {
            height: 1, fg: { type: 'named', name: 'white' },
        }));

        infoRow.addChild(clipBox);
        infoRow.addChild(featureBox);

        // ── Row 3: Grid layout demo ────────────────────
        const gridLabel = new Text(' Grid Layout — 3 columns, auto row-bucketing:', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        });

        const grid = new Grid({ border: 'single', height: 5 }, { columns: 3, gap: 1 });
        const gridColors = [
            { type: 'named', name: 'red' },
            { type: 'named', name: 'green' },
            { type: 'named', name: 'blue' },
            { type: 'named', name: 'yellow' },
            { type: 'named', name: 'magenta' },
            { type: 'named', name: 'cyan' },
        ] as const;
        const gridLabels = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];
        for (let i = 0; i < 6; i++) {
            const cell = new Box({
                flexDirection: 'column',
                border: 'single',
                borderColor: gridColors[i],
                flexGrow: 1,
            });
            cell.addChild(new Text(` ${gridLabels[i]}`, {
                height: 1,
                bold: true,
                fg: gridColors[i],
            }));
            grid.addItem(cell);
        }

        // ── Row 4: Skeleton widgets ────────────────────
        const skeletonLabel = new Text(' Skeleton — Loading placeholders (pulse animation):', {
            height: 1, bold: true, fg: { type: 'named', name: 'cyan' },
        });

        const skeletonRow = new Box({ flexDirection: 'row', gap: 1, height: 3 });
        for (let i = 0; i < 3; i++) {
            const sk = new Skeleton(
                { flexGrow: 1, border: 'single' },
                { variant: 'pulse', intervalMs: 600 + i * 150 },
            );
            this._skeletons.push(sk);
            skeletonRow.addChild(sk);
        }

        // ── Notification controls ──────────────────────
        this._notifCountText = new Text('  Notifications pushed: 0  •  Press [n] to push', {
            height: 1, fg: { type: 'named', name: 'brightBlack' },
        });

        // NotificationCenter widget (overlay-style, renders in place)
        this._notifCenter = new NotificationCenter({
            position: 'bottom-right',
            maxVisible: 3,
            width: 36,
        });
        this._notifCenter.setStyle({ height: 4 });

        // Build tree
        this.addChild(header);
        this.addChild(hint);
        this.addChild(themeRow);
        this.addChild(infoRow);
        this.addChild(gridLabel);
        this.addChild(grid);
        this.addChild(skeletonLabel);
        this.addChild(skeletonRow);
        this.addChild(this._notifCountText);
        this.addChild(this._notifCenter);
    }

    handleKey(key: string): void {
        switch (key) {
            case 'n': {
                this._notifCount++;
                const types = ['info', 'success', 'warning', 'error'] as const;
                const type = types[this._notifCount % 4];
                const messages: Record<typeof types[number], string> = {
                    info:    `Sprint 2 info #${this._notifCount}`,
                    success: `Build passed! (#${this._notifCount})`,
                    warning: `Deprecation warning #${this._notifCount}`,
                    error:   `Test failed #${this._notifCount}`,
                };
                notifications.push(messages[type], type, 3000);
                this._notifCountText.setContent(
                    `  Notifications pushed: ${this._notifCount}  •  Press [n] to push`,
                );
                break;
            }
            case 'c': {
                const text = 'Hello TermUI!';
                writeClipboard(text, process.stdout);
                this._clipboardStatus.setContent(
                    `  Status: copied "${text}" ${caps.unicode ? '✓' : '+'}`,
                );
                break;
            }
            case 'l': {
                if (!this._skeletonLoaded) {
                    this._skeletonLoaded = true;
                    for (const sk of this._skeletons) {
                        sk.unmount();
                    }
                }
                break;
            }
        }
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}
