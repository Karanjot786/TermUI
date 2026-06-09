import { Widget } from '@termuijs/widgets';
import { type Screen, type KeyEvent, type Style, caps } from '@termuijs/core';

export interface DisclosureOptions {
    summary: string;
    defaultOpen?: boolean;
    onToggle?: (open: boolean) => void;
}

export class Disclosure extends Widget {
    private _isOpen: boolean;
    private summary: string;
    private onToggleCallback?: (open: boolean) => void;
    private content: Widget;

    constructor(content: Widget, options: DisclosureOptions, style?: Partial<Style>) {
        super();
        
        this.content = content;
        this.summary = options.summary;
        this._isOpen = options.defaultOpen ?? false;
        this.onToggleCallback = options.onToggle;
        
        // Per Acceptance Criteria: focusable must be true
        this.focusable = true;
    }

    get isOpen(): boolean {
        return this._isOpen;
    }

    open(): void {
        if (!this._isOpen) {
            this._isOpen = true;
            this.markDirty();
            this.onToggleCallback?.(true);
        }
    }

    close(): void {
        if (this._isOpen) {
            this._isOpen = false;
            this.markDirty();
            this.onToggleCallback?.(false);
        }
    }

    toggle(): void {
        this._isOpen = !this._isOpen;
        this.markDirty();
        this.onToggleCallback?.(this._isOpen);
    }

    handleKey(event: KeyEvent): void {
        const key = event.key.toLowerCase();
        if (key === 'enter' || key === ' ' || key === 'space') {
            this.toggle();
        }
    }

    /**
     * Implements the abstract lifecycle method from the base Widget class
     */
    protected _renderSelf(screen: Screen): void {
        // Fall back to ASCII characters if the terminal doesn't support unicode
        const marker = caps.unicode 
            ? (this._isOpen ? '▼' : '▶') 
            : (this._isOpen ? 'v' : '>');

        const headerText = `${marker} ${this.summary}`;
        
        const startX = this.rect?.x ?? 0;
        const startY = this.rect?.y ?? 0;
        
        // Use screen.width and screen.height directly if they exist, fallback to screen.rect properties
        const screenWidth = (screen as any).width ?? (screen as any).rect?.width ?? 0;
        const screenHeight = (screen as any).height ?? (screen as any).rect?.height ?? 0;
        
        const width = this.rect?.width ?? screenWidth;

        // Render the summary header row
        for (let i = 0; i < headerText.length && i < width; i++) {
            if (screen.back && screen.back[startY] && screen.back[startY][startX + i]) {
                screen.back[startY][startX + i].char = headerText[i];
            }
        }

        // If open, render the wrapped content Widget directly below it (y + 1)
        if (this._isOpen && this.content) {
            const childRect = {
                x: startX,
                y: startY + 1,
                width: width,
                height: Math.max(0, (this.rect?.height ?? screenHeight) - 1)
            };
            
            this.content.updateRect(childRect);
            this.content.render(screen);
        }
    }
}