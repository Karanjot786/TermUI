# Live CLI Wrapper Example

This example demonstrates how to spawn a background process using `Bun.spawn` and stream its standard output directly into a TermUI `LogView` in real time.

It also uses `StreamingText` to display the status of the process with a blinking cursor.

## Running the Example

Make sure you have installed the root workspace dependencies, then inside this directory run:

```bash
bun run dev
```

The example will run `counter.ts` in the background and stream its logs. The counter will automatically exit after reaching 20, and the status bar will update to show the exit code.
