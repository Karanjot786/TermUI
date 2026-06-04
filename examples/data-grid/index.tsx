import { render } from '@termuijs/jsx';
import { DataGridView } from '@termuijs/widgets';

const columns = [
  { key: 'name', header: 'Name', width: 20, sortable: true },
  { key: 'pid', header: 'PID', width: 10 },
  { key: 'cpu', header: 'CPU%', width: 10, sortable: true },
  { key: 'memory', header: 'Memory', width: 12, sortable: true },
];

const data = Array.from({ length: 100 }, (_, i) => ({
  name: `process-${i}`,
  pid: 1000 + i,
  cpu: parseFloat((Math.random() * 100).toFixed(1)),
  memory: parseFloat((Math.random() * 512).toFixed(0)),
}));

render(<DataGridView columns={columns} data={data} height={20} width={80} />);
