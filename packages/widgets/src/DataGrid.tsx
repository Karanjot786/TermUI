import { useMemo, useState, useKeymap } from '@termuijs/jsx';
import { Box, Text } from '@termuijs/widgets';
import { caps } from '@termuijs/core';

export interface Column {
  key: string;
  header: string;
  width: number;
  sortable?: boolean;
}

export interface DataGridProps {
  columns: Column[];
  data: Record<string, string | number>[];
  height: number;
  width: number;
}

export function DataGrid({ columns, data, height, width }: DataGridProps) {
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [sortConfig, setSortConfig] = useState<
    | {
        key: string;
        direction: 'asc' | 'desc';
      }
    | null
  >(null);

  const [activeCol, setActiveCol] = useState(0);

  useKeymap({
    down: () => setScrollY((y) => Math.min(y + 1, Math.max(data.length - height + 1, 0))),
    up: () => setScrollY((y) => Math.max(y - 1, 0)),
    right: () => {
      setScrollX((x) => Math.min(x + 1, Math.max(columns.length - 1, 0)));
      setActiveCol((c) => Math.min(c + 1, columns.length - 1));
    },
    left: () => {
      setScrollX((x) => Math.max(x - 1, 0));
      setActiveCol((c) => Math.max(c - 1, 0));
    },
    enter: () => {
      const col = columns[activeCol];
      if (!col?.sortable) return;
      setSortConfig((prev) => {
        if (prev?.key !== col.key) return { key: col.key, direction: 'asc' };
        if (prev.direction === 'asc') return { key: col.key, direction: 'desc' };
        return null;
      });
    },
  });

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      if (aStr === bStr) return 0;
      return sortConfig.direction === 'asc'
        ? (aStr > bStr ? 1 : -1)
        : (aStr < bStr ? 1 : -1);
    });
  }, [data, sortConfig]);

  let visibleWidth = 0;
  const visibleColumns = columns.slice(scrollX).filter((col) => {
    visibleWidth += col.width;
    return visibleWidth <= width;
  });

  const visibleRows = sortedData.slice(scrollY, scrollY + Math.max(height - 1, 0));

  return (
    <Box width={width} height={height}>
      <Box direction="row">
        {visibleColumns.map((col) => (
          <Box key={col.key} width={col.width}>
            <Text>{col.header}</Text>
          </Box>
        ))}
      </Box>

      {visibleRows.map((row, rowIndex) => (
        <Box key={rowIndex} direction="row">
          {visibleColumns.map((col) => (
            <Box key={col.key} width={col.width}>
              <Text>{String(row[col.key] ?? '')}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
