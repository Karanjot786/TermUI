// 02-simple-button
// Demonstrates a clickable/focusable Button widget that updates a counter
// on click, using the same Widget subclass pattern as the calculator example.

import { App, type KeyEvent, type Screen, type Style, styleToCellAttrs, stringWidth, truncate } from "@termuijs/core";
import { Widget, Box, Text, Center } from "@termuijs/widgets";

class Button extends Widget {
    private label: string;
    private _onClick: () => void;

    constructor(label: string, onClick: () => void, style: Partial<Style> = {}) {
        super({ border: "single", height: 3, ...style });
        this.label = label;
        this._onClick = onClick;
        this.focusable = true;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const cellStyle = {
            ...attrs,
            fg: this.isFocused ? { type: "named" as const, name: "cyan" as const } : attrs.fg,
            bold: this.isFocused,
            inverse: this.isFocused,
        };

        for (let r = 0; r < height; r++) {
            screen.writeString(x, y + r, " ".repeat(width), cellStyle);
        }

        const paddingLeft = Math.max(0, Math.floor((width - stringWidth(this.label)) / 2));
        const visibleText = truncate(" ".repeat(paddingLeft) + this.label, width);
        screen.writeString(x, y + Math.floor(height / 2), visibleText, cellStyle);
    }

    click(): void {
        this._onClick();
    }
}

class SimpleButtonApp extends Widget {
    private counter = 0;
    private counterDisplay: Text;
    private button: Button;

    constructor() {
        super({
            flexDirection: "column",
            width: 40,
            height: 14,
            border: "double",
            borderColor: { type: "named", name: "cyan" },
            padding: { left: 2, right: 2, top: 1, bottom: 1 },
        });

        this.counterDisplay = new Text("Clicked: 0 times", {
            height: 1,
            fg: { type: "named", name: "green" },
        }, { align: "center" });

        this.button = new Button("Click Me!", () => this.handleClick(), {
            fg: { type: "named", name: "white" },
        });

        const hint = new Text("Enter/Space = click · q = quit", {
            height: 1,
            fg: { type: "named", name: "brightBlack" },
        }, { align: "center" });

        this.addChild(this.counterDisplay);
        this.addChild(this.button);
        this.addChild(hint);

        this.button.isFocused = true;
    }

    private handleClick() {
        this.counter++;
        this.counterDisplay.setContent(`Clicked: ${this.counter} times`);
        this.markDirty();
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === "q" || (event.ctrl && event.key === "c")) return false;
        if (event.key === "enter" || event.key === "return" || event.key === "space") {
            this.button.click();
        }
        return true;
    }

    protected _renderSelf(_screen: Screen): void {}
}

async function main() {
    const buttonApp = new SimpleButtonApp();
    const centerLayout = new Center({}, { horizontal: true, vertical: true });
    centerLayout.addChild(buttonApp);

    const app = new App(centerLayout, {
        fullscreen: true,
        title: "Simple Button Example",
        fps: 30,
    });

    app.events.on("key", (event) => {
        const shouldContinue = buttonApp.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error("Simple Button application error:", err);
    process.exit(1);
});
