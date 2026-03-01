import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from '../../helpers/mock-jira-client.js';

vi.mock('../../../src/services/jira-client.js', () => ({
  getJiraClient: () => mockClient,
  JiraClient: vi.fn(),
}));

import { createTestClient } from '../../helpers/test-server.js';
import { registerEpicTools } from '../../../src/tools/epics.js';
import { sampleEpic, sampleIssue } from '../../helpers/fixtures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Epic Tools', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const ctx = await createTestClient(registerEpicTools);
    client = ctx.client;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // ── jira_get_epic ─────────────────────────────────────────────────

  it('jira_get_epic returns epic details', async () => {
    mockClient.get.mockResolvedValueOnce(sampleEpic);

    const result = await client.callTool({
      name: 'jira_get_epic',
      arguments: { epicIdOrKey: 'PROJ-100' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Auth Epic');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/agile/1.0/epic/PROJ-100');
  });

  // ── jira_update_epic (uses POST, not PUT) ─────────────────────────

  it('jira_update_epic updates an epic via POST', async () => {
    mockClient.post.mockResolvedValueOnce(sampleEpic);

    const result = await client.callTool({
      name: 'jira_update_epic',
      arguments: {
        epicIdOrKey: 'PROJ-100',
        name: 'Auth Epic',
        done: false,
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Auth Epic');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/agile/1.0/epic/PROJ-100',
      { name: 'Auth Epic', done: false },
    );
  });

  // ── jira_get_epic_issues ──────────────────────────────────────────

  it('jira_get_epic_issues returns issues in epic', async () => {
    mockClient.get.mockResolvedValueOnce({
      issues: [sampleIssue],
      startAt: 0,
      maxResults: 50,
      total: 1,
      isLast: true,
    });

    const result = await client.callTool({
      name: 'jira_get_epic_issues',
      arguments: { epicIdOrKey: 'PROJ-100' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ-123');
    expect(mockClient.get).toHaveBeenCalledWith(
      '/rest/agile/1.0/epic/PROJ-100/issue',
      expect.objectContaining({ startAt: 0, maxResults: 50 }),
    );
  });

  // ── jira_move_issues_to_epic ──────────────────────────────────────

  it('jira_move_issues_to_epic moves issues into an epic', async () => {
    mockClient.post.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_move_issues_to_epic',
      arguments: {
        epicIdOrKey: 'PROJ-100',
        issues: ['PROJ-123', 'PROJ-124'],
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Successfully moved 2 issue(s) to epic PROJ-100');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/agile/1.0/epic/PROJ-100/issue',
      { issues: ['PROJ-123', 'PROJ-124'] },
    );
  });

  // ── jira_remove_issues_from_epic ──────────────────────────────────

  it('jira_remove_issues_from_epic removes issues from their epic', async () => {
    mockClient.post.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_remove_issues_from_epic',
      arguments: {
        issues: ['PROJ-123'],
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Successfully removed 1 issue(s) from their epic');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/agile/1.0/epic/none/issue',
      { issues: ['PROJ-123'] },
    );
  });
});
