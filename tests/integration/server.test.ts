import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from '../helpers/mock-jira-client.js';

vi.mock('../../src/services/jira-client.js', () => ({
  getJiraClient: () => mockClient,
  JiraClient: vi.fn(),
}));

import { createServer } from '../../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

/**
 * Helper: connect a fresh Client to the given McpServer via InMemoryTransport,
 * list the registered tools, and return the client plus a cleanup function.
 */
async function connectClient(server: ReturnType<typeof createServer>) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.1' });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return {
    client,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe('Server – tool group filtering', () => {
  let savedEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    savedEnv = process.env.ENABLED_TOOL_GROUPS;
    delete process.env.ENABLED_TOOL_GROUPS;
  });

  afterEach(() => {
    if (savedEnv !== undefined) {
      process.env.ENABLED_TOOL_GROUPS = savedEnv;
    } else {
      delete process.env.ENABLED_TOOL_GROUPS;
    }
  });

  // ── Default: all tool groups ──────────────────────────────────────

  it('registers all 66 tools when ENABLED_TOOL_GROUPS is not set', async () => {
    const server = createServer();
    const { client, cleanup } = await connectClient(server);

    try {
      const { tools } = await client.listTools();
      expect(tools.length).toBe(70);
    } finally {
      await cleanup();
    }
  });

  // ── Single group: users ───────────────────────────────────────────

  it('registers only user tools when ENABLED_TOOL_GROUPS=users', async () => {
    process.env.ENABLED_TOOL_GROUPS = 'users';
    const server = createServer();
    const { client, cleanup } = await connectClient(server);

    try {
      const { tools } = await client.listTools();
      expect(tools.length).toBe(3);

      const names = tools.map((t) => t.name);
      expect(names).toContain('jira_get_user');
      expect(names).toContain('jira_search_users');
      expect(names).toContain('jira_get_myself');
    } finally {
      await cleanup();
    }
  });

  // ── Multiple groups: users + issues ───────────────────────────────

  it('registers user + issue tools when ENABLED_TOOL_GROUPS=users,issues', async () => {
    process.env.ENABLED_TOOL_GROUPS = 'users,issues';
    const server = createServer();
    const { client, cleanup } = await connectClient(server);

    try {
      const { tools } = await client.listTools();
      // users = 3, issues = 20  =>  23
      expect(tools.length).toBe(23);

      const names = tools.map((t) => t.name);
      expect(names).toContain('jira_get_user');
      expect(names).toContain('jira_create_issue');
      expect(names).toContain('jira_search_issues');
    } finally {
      await cleanup();
    }
  });

  // ── Invalid group names are filtered out ──────────────────────────

  it('filters out invalid group names', async () => {
    process.env.ENABLED_TOOL_GROUPS = 'users,nonexistent,invalid';
    const server = createServer();
    const { client, cleanup } = await connectClient(server);

    try {
      const { tools } = await client.listTools();
      // Only the valid "users" group should register (3 tools)
      expect(tools.length).toBe(3);
    } finally {
      await cleanup();
    }
  });
});
