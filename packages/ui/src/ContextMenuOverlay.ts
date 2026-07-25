import { Widget, ContextMenu } from '@termuijs/widgets';
import type { App, ContextMenuItem } from '@termuijs/core';
import { stringWidth } from '@termuijs/core';

export interface ContextMenuOverlayOptions {
    app: App;
}

export class ContextMenuOverlay extends Widget {
    private _app: App;
    private _menu: ContextMenu | null = null;
    private _unsubOpen: (() => void) | null = null;
    private _unsubClose: (() => void) | null = null;

    constructor(options: ContextMenuOverlayOptions) {
        super({ zIndex: 4000 });
        this._app = options.app;

        this._unsubOpen = this._app.contextMenu.on('open', (state) => {
            this._showMenu(state.x, state.y, state.items, state.onSelect);
        });

        this._unsubClose = this._app.contextMenu.on('close', () => {
            this._hideMenu();
        });
    }

    private _showMenu(x: number, y: number, items: ContextMenuItem[], onSelect?: (item: ContextMenuItem, index: number) => void): void {
        this._hideMenu(); // Ensure previous is closed

        // Estimate width (ContextMenu measures it on render anyway, but we set a rect)
        const maxWidth = Math.max(...items.map(i => stringWidth(i.label || ''))) + 4;
        const height = items.length + 2;

        // Position it avoiding screen edges if possible
        let finalX = x;
        let finalY = y;
        
        if (finalX + maxWidth > this._app.screen.cols) {
            finalX = Math.max(0, this._app.screen.cols - maxWidth);
        }
        if (finalY + height > this._app.screen.rows) {
            finalY = Math.max(0, this._app.screen.rows - height);
        }

        // ContextMenu natively uses selection events, let's proxy them
        this._menu = new ContextMenu(items, finalX, finalY, {}, {
            onItemSelect: (item, index) => {
                if (onSelect) {
                    onSelect(item, index);
                }
                this._app.contextMenu.close();
            },
            onClose: () => {
                this._app.contextMenu.close();
            }
        });

        this.addChild(this._menu);
        this._app.focus.focusWidget(this._menu.id);
        this.markDirty();
    }

    private _hideMenu(): void {
        if (this._menu) {
            this.removeChild(this._menu);
            this._menu = null;
            this.markDirty();
            // Restore focus? App focus manager should handle if we lose focus.
        }
    }

    unmount(): void {
        this._unsubOpen?.();
        this._unsubClose?.();
        super.unmount();
    }

    protected _renderSelf(): void {
        // Overlay itself has no visual, it just positions its child.
    }
}
