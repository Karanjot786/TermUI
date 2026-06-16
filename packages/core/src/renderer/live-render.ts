import type { Terminal } from "../terminal/Terminal.js";
import { moveUp, clearLine } from "../utils/ansi.js";
import type { Screen } from "../terminal/Screen.js";

export class LiveRender {
    constructor(
        private readonly terminal: Terminal,
        private readonly screen: Screen,
    ) {}

    private getHeight(frame: string): number {
        if (frame.length === 0) {
            return 0;
        }

        return frame.split("\n").length;
    }

  /**
   * Renders a serialized screen buffer.
   *
   * Widgets render into a Screen object first.
   * Callers should serialize the Screen contents into a string
   * before passing it to LiveRender.render().
   */

    render(frame: string): void {
        let output = "";

        const previousHeight = this.screen.lastRenderedHeight;

        if (previousHeight > 0) {
            output += moveUp(previousHeight);

            for (let i = 0; i < previousHeight; i++) {
                output += clearLine;

                if (i < previousHeight - 1) {
                    output += "\n";
                }
            }
            output += "\r";
        }

        output += frame;

        this.terminal.write(output);

        this.screen.lastRenderedHeight = this.getHeight(frame);
    }
}
