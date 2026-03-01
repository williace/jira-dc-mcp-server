/**
 * Polls Jira's /status endpoint until the instance is ready.
 * Jira returns { state: "RUNNING" } when fully set up, or { state: "FIRST_RUN" }
 * when the setup wizard needs to run. Either state means Jira is accepting requests.
 */
import axios from 'axios';

const JIRA_URL = process.env.JIRA_BASE_URL ?? 'http://localhost:8080';
const MAX_WAIT_MS = 12 * 60 * 1000; // 12 minutes
const POLL_INTERVAL_MS = 10_000;      // 10 seconds

async function waitForJira(): Promise<void> {
  const start = Date.now();
  console.log(`Waiting for Jira at ${JIRA_URL} ...`);

  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await axios.get(`${JIRA_URL}/status`, { timeout: 5000 });
      const state = res.data?.state;
      if (state === 'RUNNING' || state === 'FIRST_RUN') {
        console.log(`Jira is ready (state: ${state}) after ${Math.round((Date.now() - start) / 1000)}s`);
        return;
      }
      console.log(`Jira state: ${state}, waiting...`);
    } catch (err: unknown) {
      const code = (err as any).code ?? (err as any).response?.status ?? 'unknown';
      console.log(`Jira not ready (${code}), retrying in ${POLL_INTERVAL_MS / 1000}s...`);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Jira did not become ready within ${MAX_WAIT_MS / 1000}s`);
}

waitForJira().catch(err => {
  console.error(err.message);
  process.exit(1);
});
