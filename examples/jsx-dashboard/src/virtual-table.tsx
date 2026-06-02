import { render, useInput, createElement as h } from '@termuijs/jsx';
import { useVirtualRows, Table, Box, Text } from '@termuijs/widgets';

function VirtualTableDemo() {
    const virtualRows = useVirtualRows({
        totalRows: 100_000,
        getCell: (row, col) => {
            if (col === 0) return `ID ${row}`;
            if (col === 1) return `Virtual Row ${row}`;
            return `Data ${row}-${col}`;
        },
    });

    useInput((event) => {
        if (event.key === 'q') {
            process.exit(0);
        } else if (event.key === 'down') {
            virtualRows.setSelectedIndex(prev => Math.min(prev + 1, 99999));
        } else if (event.key === 'up') {
            virtualRows.setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (event.key === 'pagedown') {
            virtualRows.setSelectedIndex(prev => Math.min(prev + 15, 99999));
        } else if (event.key === 'pageup') {
            virtualRows.setSelectedIndex(prev => Math.max(prev - 15, 0));
        } else if (event.key === 'home') {
            virtualRows.setSelectedIndex(0);
        } else if (event.key === 'end') {
            virtualRows.setSelectedIndex(99999);
        }
    });

    return h(Box, { flexDirection: 'column', width: '100%', height: '100%' }, [
        h(Box, { padding: 1, border: 'single', borderColor: 'cyan', flexDirection: 'column' }, [
            h(Text, { bold: true, color: 'cyan' as any }, '⚡ TermUI Table Virtualization Demo'),
            h(Text, { dim: true }, 'Rendering 100,000 rows lazily and instantaneously!'),
            h(Text, { dim: true }, 'Controls: Arrow Up/Down (navigate) • PgUp/PgDn • Home/End • Q (quit)'),
        ]),
        
        h(Box, { flexGrow: 1, border: 'single', borderColor: 'blue', padding: 1 }, [
            h(Table, {
                columns: ['ID', 'Row Name', 'Additional Data'],
                virtualRows: virtualRows,
            }),
        ]),

        h(Box, { padding: 1, border: 'single', borderColor: 'brightBlack' }, [
            h(Text, {}, `Active Row Selected: ${virtualRows.selectedIndex} / 99,999`),
        ]),
    ]);
}

render(h(VirtualTableDemo, null));
