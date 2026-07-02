import { App } from '@termuijs/core';
import { List, type ListItem } from '@termuijs/widgets';
import type { CliArgs } from '../args.js';
import { listComponents } from '../registry.js';
import { runAdd } from './add.js';

/** Interactive picker shown when `termuijs add` is run with no component name. */
export async function runPick(args: CliArgs): Promise<void> {
    if (!process.stdin.isTTY) {
        throw new Error('No component specified. Usage: termuijs add <name>');
    }
    const items = (await listComponents()).slice().sort((a, b) => a.slug.localeCompare(b.slug));

    const picked = await new Promise<string | null>((resolveChoice) => {
        const list = new List({
            items: items.map((c) => ({ label: c.slug, value: c.slug })),
            onSelect: (item: ListItem) => { app.exit(0); resolveChoice(item.value); },
        });
        const app = new App(list, { fullscreen: true, mouse: true });
        app.events.on('key', (e: { key: string }) => {
            if (e.key === 'escape') { app.exit(0); resolveChoice(null); }
        });
        app.mount();
    });

    if (!picked) { console.log('\n  Cancelled.\n'); return; }
    await runAdd({ ...args, components: [picked] });
}
