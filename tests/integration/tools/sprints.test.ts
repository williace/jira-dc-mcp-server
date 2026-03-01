import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from '../../helpers/mock-jira-client.js';

vi.mock('../../../src/services/jira-client.js', () => ({
  getJiraClient: () => mockClient,
  JiraClient: vi.fn(),
}));

import { createTestClient } from '../../helpers/test-server.js';
import { registerSprintTools } from '../../../src/tools/sprints.js';
import { sampleSprint, sampleIssue } from '../../helpers/fixtures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Sprint Tools', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const ctx = await createTestClient(registerSprintTools);
    client = ctx.client;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // ── jira_create_sprint ────────────────────────────────────────────

  it('jira_create_sprint creates a sprint', async () => {
    mockClient.post.mockResolvedValueOnce(sampleSprint);

    const result = await client.callTool({
      name: 'jira_create_sprint',
      arguments: {
        name: 'Sprint 10',
        originBoardId: 42,
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Sprint 10');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/agile/1.0/sprint',
      expect.objectContaining({ name: 'Sprint 10', originBoardId: 42 }),
    );
  });

  // ── jira_get_sprint ───────────────────────────────────────────────

  it('jira_get_sprint returns sprint details', async () => {
    mockClient.get.mockResolvedValueOnce(sampleSprint);

    const result = await client.callTool({
      name: 'jira_get_sprint',
      arguments: { sprintId: 100 },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Sprint 10');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/agile/1.0/sprint/100');
  });

  // ── jira_update_sprint ────────────────────────────────────────────

  it('jira_update_sprint updates a sprint', async () => {
    mockClient.put.mockResolvedValueOnce(sampleSprint);

    const result = await client.callTool({
      name: 'jira_update_sprint',
      arguments: {
        sprintId: 100,
        name: 'Sprint 10 - Extended',
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Sprint 10');
    expect(mockClient.put).toHaveBeenCalledWith(
      '/rest/agile/1.0/sprint/100',
      { name: 'Sprint 10 - Extended' },
    );
  });

  // ── jira_delete_sprint ────────────────────────────────────────────

  it('jira_delete_sprint deletes a sprint', async () => {
    mockClient.delete.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_delete_sprint',
      arguments: { sprintId: 100 },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Sprint 100 deleted successfully');
    expect(mockClient.delete).toHaveBeenCalledWith('/rest/agile/1.0/sprint/100');
  });

  // ── jira_get_sprint_issues ────────────────────────────────────────

  it('jira_get_sprint_issues returns issues in sprint', async () => {
    mockClient.get.mockResolvedValueOnce({
      issues: [sampleIssue],
      startAt: 0,
      maxResults: 50,
      total: 1,
    });

    const result = await client.callTool({
      name: 'jira_get_sprint_issues',
      arguments: { sprintId: 100 },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ-123');
    expect(mockClient.get).toHaveBeenCalledWith(
      '/rest/agile/1.0/sprint/100/issue',
      expect.objectContaining({ startAt: 0, maxResults: 50 }),
    );
  });

  // ── jira_move_issues_to_sprint ────────────────────────────────────

  it('jira_move_issues_to_sprint moves issues', async () => {
    mockClient.post.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_move_issues_to_sprint',
      arguments: {
        sprintId: 100,
        issues: ['PROJ-123', 'PROJ-124'],
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Successfully moved 2 issue(s) to sprint 100');
    expect(text).toContain('PROJ-123');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/agile/1.0/sprint/100/issue',
      { issues: ['PROJ-123', 'PROJ-124'] },
    );
  });

  // ── jira_move_issues_to_backlog ───────────────────────────────────

  it('jira_move_issues_to_backlog moves issues to backlog', async () => {
    mockClient.post.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_move_issues_to_backlog',
      arguments: {
        issues: ['PROJ-123'],
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Successfully moved 1 issue(s) to the backlog');
    expect(text).toContain('PROJ-123');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/agile/1.0/backlog/issue',
      { issues: ['PROJ-123'] },
    );
  });
});
