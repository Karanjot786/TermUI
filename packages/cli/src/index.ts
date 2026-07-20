import { parseArgs } from './args.js';

const HELP = `
  termuijs — add TermUI components to your project

  Usage:
    termuijs init              Initialize a starter TermUI project
    termuijs add <name...>     Copy component(s) into src/components and install deps
    termuijs add               Interactive picker
    termuijs list              List available components

  Flags:
    --dir <path>   Destination root (default: src/components)
    --dry-run      Show what would be written, write nothing
    --yes, -y      Overwrite without prompting
`;

export async function runCli(argv: string[]): Promise<void> {
    const args = parseArgs(argv);
    if (args.command === 'help') { console.log(HELP); return; }
    if (args.command === 'init') {
        const { runInit } = await import('./commands/init.js');
        await runInit();
        return;
    }
    if (args.command === 'list') {
        const { runList } = await import('./commands/list.js');
        await runList();
        return;
    }
    // command === 'add'
    if (args.components.length === 0) {
        const { runPick } = await import('./commands/pick.js');
        await runPick(args);
        return;
    }
    const { runAdd } = await import('./commands/add.js');
    await runAdd(args);
}

runCli(process.argv.slice(2)).catch((e) => {
    console.error(`\n  ✖ ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
});
