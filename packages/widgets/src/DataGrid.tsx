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

  useKeymap({
    down: () => setScrollY((y) => Math.min(y + 1, Math.max(data.length - height + 1, 0))),
    up: () => setScrollY((y) => Math.max(y - 1, 0)),
    right: () => setScrollX((x) => Math.min(x + 1, Math.max(columns.length - 1, 0))),
    left: () => setScrollX((x) => Math.max(x - 1, 0)),
  });

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = String(a[sortConfig.key] ?? '');
      const bVal = String(b[sortConfig.key] ?? '');
      if (aVal === bVal) return 0;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return sortConfig.direction === 'asc' ? -1 : 1;
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
