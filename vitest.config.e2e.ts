import { defineConfig } from 'vitest/config';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.e2e (written by seed-data.ts for local runs)
const envFile = resolve(__dirname, 'tests/e2e/.env.e2e');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) process.env[match[1]] = match[2];
  }
}

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    retry: 1,
  },
});
