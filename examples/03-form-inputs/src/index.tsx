// 03-form-inputs
// Demonstrates a TextInput widget that echoes what you typed back to
// the screen once submitted. Builds on 01 and 02 by adding real
// keyboard-driven text input.

import { App, type KeyEvent } from "@termuijs/core";
import { Text, TextInput, Widget } from "@termuijs/widgets";

class FormInputsApp extends Widget {
    private input: TextInput;
    private display: Text;

    constructor() {
        super({
            flexDirection: "column",
            width: 50,
            height: 12,
            border: "single",
            borderColor: { type: "named", name: "cyan" },
            padding: { left: 2, right: 2, top: 1, bottom: 1 },
            gap: 1,
        });

        const title = new Text("What's your name?", {
            bold: true,
            height: 1,
            fg: { type: "named", name: "cyan" },
        });

        this.input = new TextInput(
            { border: "single", height: 3, width: 36 },
            {
                placeholder: "Type here...",
                onSubmit: (value) => this.showGreeting(value),
            },
        );
        this.input.isFocused = true;

        this.display = new Text("", {
            height: 1,
            fg: { type: "named", name: "green" },
        });

        const hint = new Text("Type your name, press Enter · Esc = quit", {
            height: 1,
            fg: { type: "named", name: "brightBlack" },
        });

        this.addChild(title);
        this.addChild(this.input);
        this.addChild(this.display);
        this.addChild(hint);
    }

    private showGreeting(name: string) {
        if (name.trim().length > 0) {
            this.display.setContent(`Hello, ${name}! Nice to meet you.`);
            this.display.setStyle({ fg: { type: "named", name: "green" } });
        }
        this.markDirty();
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === "escape" || (event.ctrl && event.key === "c")) {
            return false;
        }
        this.input.handleKey(event);
        return true;
    }

    protected _renderSelf(): void {}
}

async function main() {
    const formApp = new FormInputsApp();

    const app = new App(formApp, {
        fullscreen: true,
        title: "Form Inputs Example",
        fps: 30,
    });

    app.events.on("key", (event) => {
        const shouldContinue = formApp.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error("Form Inputs application error:", err);
    process.exit(1);
});