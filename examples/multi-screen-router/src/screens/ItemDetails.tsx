/** @jsxImportSource @termuijs/jsx */
import { Box, Text } from '@termuijs/widgets';
import { useKeymap } from '@termuijs/jsx';

export default function ItemDetails(props: { id?: string }) {
    const id = props?.id ?? 'unknown';

    useKeymap([
        { key: 'b', action: () => (globalThis as any).__termui_router.back(), description: 'Back' },
        { key: 'q', action: () => process.exit(0), description: 'Quit' },
    ]);

    // Render content based on id
    const content = `Details for item #${id}`;

    return (
        <Box flexDirection="column" padding={1} gap={1}>
            <Text bold>Item Details</Text>
            <Text>{content}</Text>
            <Text dim>Press <Text bold>b</Text> to go back.</Text>
        </Box>
    );
}
