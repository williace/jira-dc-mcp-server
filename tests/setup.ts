import { vi, beforeEach } from 'vitest';

// Set required env vars so JiraClient constructor doesn't throw during import
process.env.JIRA_BASE_URL = 'https://jira.test.example.com';
process.env.JIRA_PAT = 'test-pat-token';

beforeEach(() => {
  vi.restoreAllMocks();
});
