/**
 * End-to-end tests against a real Jira Data Center instance.
 * Requires E2E_SEED_DATA env var (set by seed-data.ts) and
 * JIRA_BASE_URL + JIRA_PAT pointing to the running Jira instance.
 *
 * Run with: npm run test:e2e
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface SeedData {
  projectKey: string;
  issueKeys: string[];
  boardId: number;
  sprintId: number;
}

let client: Client;
let server: McpServer;
let seed: SeedData;

beforeAll(async () => {
  const raw = process.env.E2E_SEED_DATA;
  if (!raw) throw new Error('E2E_SEED_DATA not set — run seed-data.ts first');
  seed = JSON.parse(raw);

  // Create real MCP server (no mocks — uses real JiraClient)
  server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'e2e-test-client', version: '0.0.1' });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
});

afterAll(async () => {
  await client?.close();
  await server?.close();
});

function getText(result: any): string {
  return result.content?.[0]?.text ?? '';
}

describe('E2E: Issue operations', () => {
  it('should get an issue by key', async () => {
    const result = await client.callTool({
      name: 'jira_get_issue',
      arguments: { issueIdOrKey: seed.issueKeys[0] },
    });
    const text = getText(result);
    expect(text).toContain(seed.issueKeys[0]);
    expect(text).toContain('E2E Test Bug');
  });

  it('should search issues via JQL', async () => {
    const result = await client.callTool({
      name: 'jira_search_issues',
      arguments: { jql: `project = ${seed.projectKey}` },
    });
    const text = getText(result);
    for (const key of seed.issueKeys) {
      expect(text).toContain(key);
    }
  });

  it('should retrieve comments on an issue', async () => {
    const result = await client.callTool({
      name: 'jira_get_comments',
      arguments: { issueIdOrKey: seed.issueKeys[0] },
    });
    const text = getText(result);
    expect(text).toContain('test comment');
  });

  it('should create and delete an issue', async () => {
    const createResult = await client.callTool({
      name: 'jira_create_issue',
      arguments: {
        projectKey: seed.projectKey,
        summary: 'E2E Temporary Issue',
        issueType: 'Task',
      },
    });
    const createText = getText(createResult);
    expect(createText).toContain('Issue created');

    // Extract the key from "Issue created: TEST-4 (url)"
    const match = createText.match(/Issue created: (\S+)/);
    expect(match).toBeTruthy();
    const newKey = match![1];

    const deleteResult = await client.callTool({
      name: 'jira_delete_issue',
      arguments: { issueIdOrKey: newKey },
    });
    expect(getText(deleteResult)).toContain('deleted');
  });
});

describe('E2E: Project operations', () => {
  it('should list projects', async () => {
    const result = await client.callTool({
      name: 'jira_list_projects',
      arguments: {},
    });
    expect(getText(result)).toContain(seed.projectKey);
  });

  it('should get project details', async () => {
    const result = await client.callTool({
      name: 'jira_get_project',
      arguments: { projectIdOrKey: seed.projectKey },
    });
    expect(getText(result)).toContain('E2E Test Project');
  });
});

describe('E2E: Version operations', () => {
  it('should create and delete a version', async () => {
    // Create
    const createResult = await client.callTool({
      name: 'jira_create_version',
      arguments: {
        projectKey: seed.projectKey,
        name: 'E2E Temporary Version',
      },
    });
    const createText = getText(createResult);
    expect(createText).toContain('E2E Temporary Version');

    // Find the version ID from project versions
    const versionsResult = await client.callTool({
      name: 'jira_get_project_versions',
      arguments: { projectIdOrKey: seed.projectKey, response_format: 'json' },
    });
    const versions = JSON.parse(getText(versionsResult));
    const testVersion = versions.find((v: any) => v.name === 'E2E Temporary Version');
    expect(testVersion).toBeDefined();

    // Delete via removeAndSwap
    const deleteResult = await client.callTool({
      name: 'jira_delete_version',
      arguments: { versionId: String(testVersion.id) },
    });
    expect(getText(deleteResult)).toContain('deleted successfully');
  });
});

describe('E2E: Board and Sprint operations', () => {
  it('should list boards and find the test board', async () => {
    const result = await client.callTool({
      name: 'jira_list_boards',
      arguments: {},
    });
    expect(getText(result)).toContain(String(seed.boardId));
  });

  it('should get sprint details', async () => {
    const result = await client.callTool({
      name: 'jira_get_sprint',
      arguments: { sprintId: seed.sprintId },
    });
    const text = getText(result);
    expect(text).toContain('E2E Test Sprint');
  });

  it('should list sprint issues', async () => {
    const result = await client.callTool({
      name: 'jira_get_sprint_issues',
      arguments: { sprintId: seed.sprintId },
    });
    const text = getText(result);
    expect(text).toContain(seed.issueKeys[0]);
  });
});

describe('E2E: User operations', () => {
  it('should get the current user', async () => {
    const result = await client.callTool({
      name: 'jira_get_myself',
      arguments: {},
    });
    expect(getText(result)).toContain('admin');
  });
});

describe('E2E: Metadata operations', () => {
  it('should list issue types', async () => {
    const result = await client.callTool({
      name: 'jira_list_issue_types',
      arguments: {},
    });
    const text = getText(result);
    expect(text).toContain('Bug');
    expect(text).toContain('Story');
  });

  it('should list priorities', async () => {
    const result = await client.callTool({
      name: 'jira_list_priorities',
      arguments: {},
    });
    const text = getText(result);
    expect(text).toContain('High');
  });
});
