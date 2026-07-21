// 01-hello-world
// The simplest possible TermUI app: mount a Box, put a Text widget in it,
// center it on screen, and render.

import { App } from "@termuijs/core";
import { Box, Text, Center } from "@termuijs/widgets";

async function main() {
    // A bordered box holding our greeting
    const helloBox = new Box({
        flexDirection: "column",
        width: 40,
        height: 7,
        border: "single",
        borderColor: { type: "named", name: "cyan" },
        padding: { left: 2, right: 2, top: 1, bottom: 1 },
    });

    const greeting = new Text("Hello, World!", {
        bold: true,
        height: 1,
        fg: { type: "named", name: "cyan" },
    }, { align: "center" });

    const hint = new Text("Press 'q' to quit", {
        height: 1,
        fg: { type: "named", name: "brightBlack" },
    }, { align: "center" });

    helloBox.addChild(greeting);
    helloBox.addChild(hint);

    // Center the box in the terminal
    const centerLayout = new Center({}, { horizontal: true, vertical: true });
    centerLayout.addChild(helloBox);

    const app = new App(centerLayout, {
        fullscreen: true,
        title: "Hello World Example",
        fps: 30,
    });

    app.events.on("key", (event) => {
        if (event.key === "q" || (event.ctrl && event.key === "c")) {
            app.exit(0);
        }
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error("Hello World application error:", err);
    process.exit(1);
});
