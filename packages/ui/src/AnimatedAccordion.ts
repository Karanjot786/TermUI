import { Widget, Text } from '@termuijs/widgets';
import { type Style, mergeStyles, defaultStyle, stringWidth } from '@termuijs/core';
import { type SpringState, stepSpring, SPRING_PRESETS } from '@termuijs/motion';

export interface AnimatedAccordionItemOptions {
    title: string;
    content: Widget;
    style?: Partial<Style>;
}

export class AnimatedAccordionItem extends Widget {
    public readonly title: string;
    public readonly content: Widget;
    public isOpen = false;

    private _heightSpring: SpringState;
    private _headerHeight = 1;

    public onToggle?: () => void;

    constructor(options: AnimatedAccordionItemOptions) {
        super(mergeStyles(defaultStyle(), options.style || {}));
        this.title = options.title;
        this.content = options.content;
        this.focusable = true;
        
        // Setup spring for height animation
        this._heightSpring = {
            value: 0,
            target: 0,
            velocity: 0,
            done: true
        };

        this.addChild(this.content);
        
        this.events.on('click', () => {
            this.toggle();
            this.onToggle?.();
        });
    }

    handleKey(event: any): void {
        if (event.key === 'enter' || event.key === 'space') {
            this.toggle();
            this.onToggle?.();
            if (event.preventDefault) event.preventDefault();
            if (event.stopPropagation) event.stopPropagation();
        }
    }

    toggle(): void {
        this.isOpen = !this.isOpen;
        // The target height will be computed during getLayoutNode or layout phase
        this.markDirty();
    }

    setTargetHeight(h: number): void {
        this._heightSpring.target = this.isOpen ? h : 0;
        this.markDirty();
    }

    updateAnimation(dt: number): boolean {
        this._heightSpring = stepSpring(this._heightSpring, SPRING_PRESETS.default, dt);
        if (!this._heightSpring.done) {
            this.markDirty();
            return true; // Still animating
        }
        return false;
    }

    get currentHeight(): number {
        return this._headerHeight + Math.round(this._heightSpring.value);
    }

    protected _renderSelf(screen: any): void {
        // Draw header
        const headerText = `${this.isOpen ? '▼' : '▶'} ${this.title}`;
        
        for (let i = 0; i < stringWidth(headerText); i++) {
            const char = headerText[i] || ' ';
            screen.setCell(this.rect.x + i, this.rect.y, { 
                char, 
                fg: this.style.fg, 
                bg: this.style.bg 
            });
        }
        
        // Position content properly
        if (Math.round(this._heightSpring.value) > 0) {
            this.content.updateRect({
                x: this.rect.x + 2,
                y: this.rect.y + this._headerHeight,
                width: this.rect.width - 2,
                height: Math.round(this._heightSpring.value)
            });
        } else {
            this.content.updateRect({ x: 0, y: 0, width: 0, height: 0 });
        }
    }
}

export interface AnimatedAccordionOptions {
    allowMultiple?: boolean;
    style?: Partial<Style>;
}

export class AnimatedAccordion extends Widget {
    private _allowMultiple: boolean;
    private _items: AnimatedAccordionItem[] = [];

    constructor(options: AnimatedAccordionOptions = {}) {
        super(mergeStyles(defaultStyle(), options.style || {}));
        this._allowMultiple = options.allowMultiple ?? false;
    }

    addItem(item: AnimatedAccordionItem): void {
        this._items.push(item);
        this.addChild(item);
        
        item.onToggle = () => {
            if (!this._allowMultiple && item.isOpen) {
                for (const other of this._items) {
                    if (other !== item && other.isOpen) {
                        other.isOpen = false;
                        other.markDirty();
                    }
                }
            }
        };

        this.markDirty();
    }

    protected _renderSelf(screen: any): void {
        let currentY = this.rect.y;
        let isAnimating = false;

        for (const item of this._items) {
            // Assuming content natural height is its rect.height if we measured it, 
            // but for simplicity, let's say it requests 5 rows.
            // In a real framework, we'd query content.layout.
            const contentHeight = item.content.rect.height || 5; 
            item.setTargetHeight(contentHeight);

            // Animate
            // Assuming dt = 16ms for 60fps simulation
            if (item.updateAnimation(0.016)) {
                isAnimating = true;
            }

            const h = item.currentHeight;
            item.updateRect({
                x: this.rect.x,
                y: currentY,
                width: this.rect.width,
                height: h
            });

            currentY += h;
        }

        if (isAnimating) {
            // Since we are animating, we need to request the next frame.
            // App handles dirty widgets by re-rendering.
            this.markDirty();
        }
    }
}
