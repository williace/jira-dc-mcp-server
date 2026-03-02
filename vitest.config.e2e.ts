import { defineConfig } from 'vitest/config';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Load .env.e2e (written by seed-data.ts for local runs)
const envFile = fileURLToPath(new URL('tests/e2e/.env.e2e', import.meta.url));
const shouldOverrideEnv = process.env.E2E_DOTENV_OVERRIDE === 'true';
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(\w+)=(.*)$/);
    if (match) {
      const key = match[1];
      const value = match[2];
      if (process.env[key] === undefined || shouldOverrideEnv) {
        process.env[key] = value;
      }
    }
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
