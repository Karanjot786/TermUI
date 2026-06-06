/** @jsxImportSource @termuijs/jsx */
import { Box, Text } from '@termuijs/widgets';
import { useKeymap } from '@termuijs/jsx';
import { Router } from '@termuijs/router';

// Use the same router instance from the entry module via import from index.
// To avoid circular imports, create a small singleton import path —
// the example keeps a module-local router in index and captures it by reference.
// Here we import the Router type and access the global router via require cache.

declare const router: Router;

export default function Home() {
    // Navigate to items list with `i` or Enter
    useKeymap([
        {
            key: 'i',
            action: () => (globalThis as any).__termui_router.push('/items'),
            description: 'Open items',
        },
        {
            key: 'enter',
            action: () => (globalThis as any).__termui_router.push('/items'),
            description: 'Open items',
        },
        {
            key: 'q',
            action: () => process.exit(0),
            description: 'Quit',
        },
    ]);

    return (
        <Box flexDirection="column" padding={1} gap={1}>
            <Text bold>Multi-screen Router</Text>
            <Text dim>Press <Text bold>i</Text> to open the items list.</Text>
            <Text dim>Press <Text bold>q</Text> to quit.</Text>
        </Box>
    );
}
