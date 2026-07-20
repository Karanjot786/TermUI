// Debug script: logs every key event to see what InputParser emits
import { App } from '@termuijs/core';
import { Box, Text } from '@termuijs/widgets';
import type { Screen } from '@termuijs/core';
import * as fs from 'node:fs';

class DebugApp extends Box {
    private _log: Text;
    private _lines: string[] = ['Press any key (q to quit)...'];

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1 });
        this._log = new Text(this._lines.join('\n'), { flexGrow: 1 });
        this.addChild(this._log);
    }

    addLine(line: string): void {
        this._lines.push(line);
        if (this._lines.length > 20) this._lines.shift();
        this._log.setContent(this._lines.join('\n'));
        // Also write to file for examination
        fs.appendFileSync('/tmp/termui-keys.log', line + '\n');
    }
}

async function main() {
    fs.writeFileSync('/tmp/termui-keys.log', '--- Key debug log ---\n');
    const root = new DebugApp();
    const app = new App(root, { fullscreen: true, title: 'Key Debug' });

    app.events.on('key', (event) => {
        const desc = `key="${event.key}" ctrl=${event.ctrl} alt=${event.alt} shift=${event.shift} raw=[${Array.from(event.raw).map(b => '0x' + b.toString(16).padStart(2, '0')).join(',')}]`;
        root.addLine(desc);
        if (event.key === 'q') app.exit(0);
        app.requestRender();
    });

    await app.mount();
    process.exit(0);
}

main().catch(console.error);
