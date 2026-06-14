import { 
    type Screen, 
    type KeyEvent, 
    type Style, 
    caps, 
    mergeStyles, 
    defaultStyle, 
    styleToCellAttrs 
} from '@termuijs/core';
import { Widget } from '@termuijs/widgets';

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
    private _customStyle: Style;

    constructor(content: Widget, options: DisclosureOptions, style?: Partial<Style>) {
        super();
        
        this.content = content;
        this.summary = options.summary;
        this._isOpen = options.defaultOpen ?? false;
        this.onToggleCallback = options.onToggle;
        
        this._customStyle = mergeStyles(defaultStyle(), style ?? {}) as Style;
        
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

    protected _renderSelf(screen: Screen): void {
        const marker = caps.unicode 
            ? (this._isOpen ? '▼' : '▶') 
            : (this._isOpen ? 'v' : '>');

        const headerText = `${marker} ${this.summary}`;
        
        const startX = this.rect?.x ?? 0;
        const startY = this.rect?.y ?? 0;
        
        const screenWidth = (screen as any).width ?? (screen as any).rect?.width ?? 0;
        const screenHeight = (screen as any).height ?? (screen as any).rect?.height ?? 0;
        
        const width = this.rect?.width ?? screenWidth;

        for (let i = 0; i < headerText.length && i < width; i++) {
            if (screen.back && screen.back[startY] && screen.back[startY][startX + i]) {
                const cell = screen.back[startY][startX + i] as any;
                cell.char = headerText[i];
                
                cell['attrs'] = styleToCellAttrs(this._customStyle);
            }
        }

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