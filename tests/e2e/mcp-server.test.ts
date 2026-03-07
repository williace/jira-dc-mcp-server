/**
 * E2E tests that validate the MCP server via both stdio and HTTP transports.
 *
 * - Stdio: spawns a local `node dist/index.js` process (tests the real process lifecycle)
 * - HTTP: connects to the MCP server running in Docker on MCP_SERVER_URL (default http://localhost:3001)
 *
 * Requires E2E_SEED_DATA env var (set by seed-data.ts) and
 * JIRA_BASE_URL + JIRA_PAT pointing to the running Jira instance.
 *
 * Run with: npm run test:e2e
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { resolve } from 'path';

interface SeedData {
  projectKey: string;
  issueKeys: string[];
  boardId: number;
  sprintId: number;
}

const SERVER_ENTRY = resolve(import.meta.dirname, '../../dist/index.js');
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';

let seed: SeedData;

function getServerEnv(): Record<string, string> {
  return {
    JIRA_BASE_URL: process.env.JIRA_BASE_URL!,
    JIRA_PAT: process.env.JIRA_PAT!,
    // Inherit PATH so `node` resolves correctly
    PATH: process.env.PATH!,
    NODE_ENV: 'test',
  };
}

function getText(result: any): string {
  return result.content?.[0]?.text ?? '';
}

beforeAll(() => {
  const raw = process.env.E2E_SEED_DATA;
  if (!raw) throw new Error('E2E_SEED_DATA not set — run seed-data.ts first');
  seed = JSON.parse(raw);
});

// ---------------------------------------------------------------------------
// Stdio transport — spawns a local process
// ---------------------------------------------------------------------------
describe('MCP Server: stdio transport', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: 'node',
      args: [SERVER_ENTRY],
      env: getServerEnv(),
      stderr: 'pipe',
    });

    client = new Client({ name: 'e2e-stdio-client', version: '0.0.1' });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client?.close();
  });

  it('should list all registered tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(60);

    const names = tools.map((t) => t.name);
    expect(names).toContain('jira_get_issue');
    expect(names).toContain('jira_search_issues');
    expect(names).toContain('jira_list_projects');
    expect(names).toContain('jira_get_myself');
  });

  it('should call jira_get_myself', async () => {
    const result = await client.callTool({
      name: 'jira_get_myself',
      arguments: {},
    });
    expect(getText(result)).toContain('admin');
  });

  it('should call jira_get_issue with seed data', async () => {
    const result = await client.callTool({
      name: 'jira_get_issue',
      arguments: { issueIdOrKey: seed.issueKeys[0] },
    });
    const text = getText(result);
    expect(text).toContain(seed.issueKeys[0]);
    expect(text).toContain('E2E Test Bug');
  });
});

// ---------------------------------------------------------------------------
// HTTP transport — connects to the Docker MCP server
// ---------------------------------------------------------------------------
describe('MCP Server: HTTP transport', () => {
  let client: Client;
  let transport: StreamableHTTPClientTransport;

  beforeAll(async () => {
    // Verify the MCP server is reachable before connecting
    const healthRes = await fetch(`${MCP_SERVER_URL}/health`);
    if (!healthRes.ok) {
      throw new Error(
        `MCP server at ${MCP_SERVER_URL} is not healthy (HTTP ${healthRes.status}). ` +
        'Start it with: docker compose -f tests/e2e/docker-compose.yml up -d mcp-server',
      );
    }

    transport = new StreamableHTTPClientTransport(
      new URL(`${MCP_SERVER_URL}/mcp`),
    );

    client = new Client({ name: 'e2e-http-client', version: '0.0.1' });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client?.close();
  });

  it('should respond to health check', async () => {
    const res = await fetch(`${MCP_SERVER_URL}/health`);
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('should list all registered tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(60);

    const names = tools.map((t) => t.name);
    expect(names).toContain('jira_get_issue');
    expect(names).toContain('jira_get_myself');
  });

  it('should call jira_get_myself', async () => {
    const result = await client.callTool({
      name: 'jira_get_myself',
      arguments: {},
    });
    expect(getText(result)).toContain('admin');
  });

  it('should call jira_get_issue with seed data', async () => {
    const result = await client.callTool({
      name: 'jira_get_issue',
      arguments: { issueIdOrKey: seed.issueKeys[0] },
    });
    const text = getText(result);
    expect(text).toContain(seed.issueKeys[0]);
    expect(text).toContain('E2E Test Bug');
  });
});
