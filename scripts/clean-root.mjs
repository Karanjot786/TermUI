import { rmSync } from 'node:fs';
import { join } from 'node:path';

rmSync(join(process.cwd(), 'node_modules'), {
  recursive: true,
  force: true,
});
