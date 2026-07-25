import { Widget, Text } from '@termuijs/widgets';
import { type App, type Style, mergeStyles, defaultStyle, stringWidth, styleToCellAttrs, splitGraphemes } from '@termuijs/core';
import { type SpringState, stepSpring, SPRING_PRESETS } from '@termuijs/motion';

export type GlobalToastType = 'success' | 'error' | 'info' | 'warning';

export interface GlobalToastOptions {
    message: string;
    type?: GlobalToastType;
    duration?: number;
}

interface ToastInternal {
    id: string;
    message: string;
    type: GlobalToastType;
    duration: number;
    createdAt: number;
    slideSpring: SpringState;
    widget: Text;
    width: number;
    graphemes: { char: string; width: number }[];
}

let toastIdCounter = 0;
let globalToastProvider: ToastProvider | null = null;

export const toast = {
    success: (message: string, duration = 3000) => globalToastProvider?.show({ message, type: 'success', duration }),
    error: (message: string, duration = 4000) => globalToastProvider?.show({ message, type: 'error', duration }),
    info: (message: string, duration = 3000) => globalToastProvider?.show({ message, type: 'info', duration }),
    warning: (message: string, duration = 3500) => globalToastProvider?.show({ message, type: 'warning', duration }),
};

export interface ToastProviderOptions {
    app: App;
    style?: Partial<Style>;
}

export class ToastProvider extends Widget {
    private _app: App;
    private _toasts: ToastInternal[] = [];
    private _timer: ReturnType<typeof setInterval> | null = null;

    constructor(options: ToastProviderOptions) {
        super(mergeStyles(defaultStyle(), { zIndex: 3000, overflow: 'visible', ...options.style }));
        this._app = options.app;
        globalToastProvider = this;

        // Start animation/cleanup loop
        this._timer = setInterval(() => {
            this._tick();
        }, 16);
    }

    unmount(): void {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        if (globalToastProvider === this) {
            globalToastProvider = null;
        }
        super.unmount();
    }

    show(options: GlobalToastOptions): void {
        const type = options.type || 'info';
        const fgColor = type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'yellow' : 'cyan';
        
        const widget = new Text(options.message, {
            fg: 'white' as any,
            bg: fgColor as any,
        });
        
        const tWidth = stringWidth(options.message);
        const graphemes = splitGraphemes(options.message).map(char => ({ char, width: stringWidth(char) }));

        const newToast: ToastInternal = {
            id: `toast-${++toastIdCounter}`,
            message: options.message,
            type,
            duration: options.duration || 3000,
            createdAt: Date.now(),
            slideSpring: {
                value: 0,
                target: 1, // 1 = fully on screen, 0 = fully off screen
                velocity: 0,
                done: false
            },
            widget,
            width: tWidth,
            graphemes
        };

        this._toasts.push(newToast);
        this.addChild(widget);
        this.markDirty();
    }

    private _tick(): void {
        if (this._toasts.length === 0) return;

        let needsRender = false;
        const now = Date.now();
        const screenW = this._app.screen.cols;
        const screenH = this._app.screen.rows;

        let yOffset = screenH - 1; // start from bottom

        // Process in reverse to calculate stack correctly, but array is oldest first
        for (let i = this._toasts.length - 1; i >= 0; i--) {
            const t = this._toasts[i];
            const age = now - t.createdAt;

            // Update target if it should disappear
            if (age > t.duration) {
                t.slideSpring.target = 0;
            }

            // Animate
            const prevVal = t.slideSpring.value;
            t.slideSpring = stepSpring(t.slideSpring, SPRING_PRESETS.default, 0.016);
            if (Math.abs(t.slideSpring.value - prevVal) > 0.001 || !t.slideSpring.done) {
                needsRender = true;
            }

            // Calculate position
            // If value is 1, x = screenW - width - 1
            // If value is 0, x = screenW
            const targetX = screenW - t.width - 2;
            const xOffscreen = screenW;
            const currentX = Math.round(xOffscreen - (xOffscreen - targetX) * t.slideSpring.value);

            t.widget.updateRect({
                x: currentX,
                y: yOffset,
                width: t.width + 2, // padding
                height: 1
            });

            // If it's fully on screen (value > 0.1), stack next ones above
            if (t.slideSpring.value > 0.1) {
                yOffset -= 2; 
            }
        }

        // Cleanup fully disappeared toasts
        const originalLen = this._toasts.length;
        this._toasts = this._toasts.filter(t => t.slideSpring.target > 0 || Math.round(t.slideSpring.value * 100) > 0);
        
        if (this._toasts.length !== originalLen) {
            // Remove widgets
            const activeWidgets = new Set(this._toasts.map(t => t.widget));
            this._children = this._children.filter(c => activeWidgets.has(c as Text));
            needsRender = true;
        }

        if (needsRender) {
            this.markDirty();
            this._app.requestRender();
        }
    }

    protected _renderSelf(screen: typeof this._app.screen): void {
        for (const t of this._toasts) {
            if (t.slideSpring.value <= 0.01) continue;

            const r = t.widget.rect;
            const fg = t.widget.style.fg || 'white';
            const bg = t.widget.style.bg || 'blue';
            const attrs = styleToCellAttrs({ fg: fg as any, bg: bg as any });

            // Draw padded background
            for (let i = 0; i < r.width; i++) {
                const x = r.x + i;
                if (x >= 0 && x < screen.cols && r.y >= 0 && r.y < screen.rows) {
                    screen.setCell(x, r.y, { char: ' ', ...attrs });
                }
            }

            // Draw text
            let colOffset = 1;
            for (const { char, width } of t.graphemes) {
                const x = r.x + colOffset;
                if (x >= 0 && x < screen.cols && r.y >= 0 && r.y < screen.rows) {
                    screen.setCell(x, r.y, { char, ...attrs });
                }
                colOffset += width;
            }
        }
    }
}
