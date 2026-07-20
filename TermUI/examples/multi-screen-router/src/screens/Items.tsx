/** @jsxImportSource @termuijs/jsx */
import { Box, Text } from '@termuijs/widgets';
import { useKeymap, useState } from '@termuijs/jsx';

const ITEMS = Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), name: `Item ${i + 1}` }));

export default function Items() {
    const [selected, setSelected] = useState(0);

    useKeymap([
        { key: 'arrowup', action: () => setSelected((s) => Math.max(0, s - 1)), description: 'Up' },
        { key: 'arrowdown', action: () => setSelected((s) => Math.min(ITEMS.length - 1, s + 1)), description: 'Down' },
        { key: 'enter', action: () => (globalThis as any).__termui_router.push(`/items/${ITEMS[selected].id}`), description: 'Open' },
        { key: 'b', action: () => (globalThis as any).__termui_router.back(), description: 'Back' },
        { key: 'q', action: () => process.exit(0), description: 'Quit' },
    ]);

    return (
        <Box flexDirection="column" padding={1} gap={1}>
            <Text bold>Items</Text>
            {ITEMS.map((it, idx) => (
                <Text key={it.id} dim={idx !== selected}>{idx === selected ? '▸ ' : '  '}{it.name}</Text>
            ))}
            <Text dim>Use Arrow keys to move, Enter to open, b to go back.</Text>
        </Box>
    );
}
