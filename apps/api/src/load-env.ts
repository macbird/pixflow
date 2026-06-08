import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(__dirname, '../.env');

if (process.env.NODE_ENV !== 'production' && existsSync(envPath)) {
  config({ path: envPath, override: false });
}
