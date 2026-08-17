import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type LayoutNode,
    type MouseEvent as TermMouseEvent,
    mergeStyles,
    defaultStyle,
    createLayoutNode,
    InputParser,
    computeLayout,
    styleToCellAttrs,
} from '@termuijs/core';
import { Window } from './Window.js';

export class WindowManager extends Widget {
    private _globalInput: InputParser | null = null;
    private _unsubGlobalMouse: (() => void) | null = null;

    private _dragState: {
        mode: 'drag' | 'resize' | null;
        win: Window | null;
        startX: number;
        startY: number;
        winStartX: number;
        winStartY: number;
        winStartWidth: number;
        winStartHeight: number;
        resizeDirection: 'both' | 'horizontal' | 'vertical' | null;
    } = {
        mode: null,
        win: null,
        startX: 0,
        startY: 0,
        winStartX: 0,
        winStartY: 0,
        winStartWidth: 0,
        winStartHeight: 0,
        resizeDirection: null,
    };

    constructor(style?: Partial<Style>) {
        super(mergeStyles(defaultStyle(), { display: 'flex', ...style }));
    }

    addWindow(window: Window): void {
        this.addChild(window);
        this._focusWindow(window);
    }

    private _focusWindow(window: Window): void {
        const idx = this._children.indexOf(window);
        if (idx >= 0) {
            // Move to end of children list to render on top
            this._children.splice(idx, 1);
            this._children.push(window);

            // Set focus highlight
            for (const child of this._children) {
                if (child instanceof Window) {
                    child.isFocused = (child === window);
                }
            }
            this.markDirty();
        }
    }

    override mount(): void {
        super.mount();
        this._globalInput = new InputParser(process.stdin);
        this._globalInput.start();
        this._unsubGlobalMouse = this._globalInput.onMouse((event: TermMouseEvent) => this._handleGlobalMouse(event));
    }

    override unmount(): void {
        this._unsubGlobalMouse?.();
        this._unsubGlobalMouse = null;
        this._globalInput?.stop();
        this._globalInput = null;
        super.unmount();
    }

    private _handleGlobalMouse(event: TermMouseEvent): void {
        const { x: managerX, y: managerY, width: managerW, height: managerH } = this._rect;

        if (event.type === 'mousedown') {
            // Find which window was clicked (last to first child, i.e., top-most rendered)
            for (let i = this._children.length - 1; i >= 0; i--) {
                const child = this._children[i];
                if (child instanceof Window && !child.isClosed) {
                    const localX = event.x - child.rect.x;
                    const localY = event.y - child.rect.y;

                    // Hit test the window bounds
                    if (
                        event.x >= child.rect.x &&
                        event.x < child.rect.x + child.rect.width &&
                        event.y >= child.rect.y &&
                        event.y < child.rect.y + (child.isMinimized ? 1 : child.rect.height)
                    ) {
                        this._focusWindow(child);

                        // Check controls on title bar
                        const target = child.getClickTarget(localX, localY);
                        if (target === 'close') {
                            child.close();
                            return;
                        } else if (target === 'minimize') {
                            child.minimize();
                            return;
                        } else if (target === 'maximize') {
                            child.maximize();
                            return;
                        } else if (target === 'title' && child.draggable) {
                            // Start dragging
                            this._dragState = {
                                mode: 'drag',
                                win: child,
                                startX: event.x,
                                startY: event.y,
                                winStartX: child.windowX,
                                winStartY: child.windowY,
                                winStartWidth: child.windowWidth,
                                winStartHeight: child.windowHeight,
                                resizeDirection: null,
                            };
                            return;
                        }

                        // Check resizing boundaries
                        if (child.resizable && !child.isMaximized && !child.isMinimized) {
                            const onRight = (localX === child.rect.width - 1);
                            const onBottom = (localY === child.rect.height - 1);

                            if (onRight || onBottom) {
                                this._dragState = {
                                    mode: 'resize',
                                    win: child,
                                    startX: event.x,
                                    startY: event.y,
                                    winStartX: child.windowX,
                                    winStartY: child.windowY,
                                    winStartWidth: child.windowWidth,
                                    winStartHeight: child.windowHeight,
                                    resizeDirection: (onRight && onBottom) ? 'both' : onRight ? 'horizontal' : 'vertical',
                                };
                                return;
                            }
                        }

                        // Clicked inside the window content
                        return;
                    }
                }
            }
        } else if (event.type === 'mousemove') {
            const drag = this._dragState;
            if (drag.mode && drag.win) {
                const dx = event.x - drag.startX;
                const dy = event.y - drag.startY;

                if (drag.mode === 'drag') {
                    // Update relative position and clamp title bar within manager boundary
                    const nextX = drag.winStartX + dx;
                    const nextY = drag.winStartY + dy;
                    
                    drag.win.windowX = Math.max(0, Math.min(managerW - 3, nextX));
                    drag.win.windowY = Math.max(0, Math.min(managerH - 1, nextY));
                } else if (drag.mode === 'resize') {
                    const direction = drag.resizeDirection;
                    if (direction === 'both' || direction === 'horizontal') {
                        const nextW = drag.winStartWidth + dx;
                        drag.win.windowWidth = Math.max(drag.win.minWidth, nextW);
                    }
                    if (direction === 'both' || direction === 'vertical') {
                        const nextH = drag.winStartHeight + dy;
                        drag.win.windowHeight = Math.max(drag.win.minHeight, nextH);
                    }
                }
                this.markDirty();
            }
        } else if (event.type === 'mouseup') {
            this._dragState = {
                mode: null,
                win: null,
                startX: 0,
                startY: 0,
                winStartX: 0,
                winStartY: 0,
                winStartWidth: 0,
                winStartHeight: 0,
                resizeDirection: null,
            };
        }
    }

    private _managerLayoutNode: LayoutNode | null = null;

    override getLayoutNode(): LayoutNode {
        // Return a node for ourselves, but bypass Flexbox laying out our windows
        if (this._managerLayoutNode) {
            this._managerLayoutNode.style = this._style;
            this._managerLayoutNode.children = [];
        } else {
            this._managerLayoutNode = createLayoutNode(this.id, this._style, []);
        }
        return this._managerLayoutNode;
    }

    override syncLayout(): void {
        super.syncLayout(); // Syncs WindowManager's computed rect

        const { x: managerX, y: managerY, width: managerW, height: managerH } = this._rect;

        for (const child of this._children) {
            if (child instanceof Window && !child.isClosed) {
                let winX = child.windowX;
                let winY = child.windowY;
                let winW = child.windowWidth;
                let winH = child.windowHeight;

                if (child.isMaximized) {
                    winX = 0;
                    winY = 0;
                    winW = managerW;
                    winH = managerH;
                } else if (child.isMinimized) {
                    winH = 1;
                }

                // Apply absolute computed bounds to the Window
                child.updateRect({
                    x: managerX + winX,
                    y: managerY + winY,
                    width: winW,
                    height: winH,
                });

                // Compute layout of the Window's children using its content region as the viewport
                const contentRect = child.getContentRect();
                const winLayoutNode = child.getLayoutNode();
                
                computeLayout(winLayoutNode, contentRect.width, contentRect.height);

                // Shift child coordinates from relative content space to absolute screen space
                const shiftCoordinates = (node: any, dx: number, dy: number) => {
                    node.computed.x += dx;
                    node.computed.y += dy;
                    for (const c of node.children) {
                        shiftCoordinates(c, dx, dy);
                    }
                };

                for (const c of winLayoutNode.children) {
                    shiftCoordinates(c, contentRect.x, contentRect.y);
                }

                // Restore Window's own layout node to its absolute screen bounds
                winLayoutNode.computed = {
                    x: managerX + winX,
                    y: managerY + winY,
                    width: winW,
                    height: winH,
                };

                child.syncLayout();
            }
        }
    }

    protected _renderSelf(screen: Screen): void {
        // WindowManager acts as a transparent backdrop container
        const { x, y, width, height } = this._rect;
        const cellAttrs = styleToCellAttrs(this.style);
        for (let row = 0; row < height; row++) {
            screen.writeString(x, y + row, ' '.repeat(width), cellAttrs);
        }
    }
}
