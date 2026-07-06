import { listComponents } from '../registry.js';

export async function runList(): Promise<void> {
    const items = await listComponents();
    console.log(`\n  ${items.length} components:\n`);
    for (const c of items.slice().sort((a, b) => a.slug.localeCompare(b.slug))) {
        console.log(`    ${c.slug.padEnd(28)} ${c.description ?? ''}`);
    }
    console.log(`\n  Add one with:  termuijs add <name>\n`);
}
