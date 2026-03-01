import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from '../../helpers/mock-jira-client.js';

vi.mock('../../../src/services/jira-client.js', () => ({
  getJiraClient: () => mockClient,
  JiraClient: vi.fn(),
}));

import { createTestClient } from '../../helpers/test-server.js';
import { registerIssueTools } from '../../../src/tools/issues.js';
import {
  sampleIssue,
  sampleIssue2,
  sampleCreateIssueResponse,
  sampleComment,
  sampleTransitions,
} from '../../helpers/fixtures.js';
import { JiraApiError } from '../../../src/utils/errors.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Issue Tools', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const ctx = await createTestClient(registerIssueTools);
    client = ctx.client;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // ── jira_create_issue ─────────────────────────────────────────────

  it('jira_create_issue creates an issue and returns key', async () => {
    mockClient.post.mockResolvedValueOnce(sampleCreateIssueResponse);

    const result = await client.callTool({
      name: 'jira_create_issue',
      arguments: {
        projectKey: 'PROJ',
        summary: 'New bug',
        issueType: 'Bug',
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Issue created: PROJ-125');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/api/2/issue',
      {
        fields: {
          project: { key: 'PROJ' },
          summary: 'New bug',
          issuetype: { name: 'Bug' },
        },
      },
    );
  });

  // ── jira_get_issue ────────────────────────────────────────────────

  it('jira_get_issue returns issue details', async () => {
    mockClient.get.mockResolvedValueOnce(sampleIssue);

    const result = await client.callTool({
      name: 'jira_get_issue',
      arguments: { issueIdOrKey: 'PROJ-123' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ-123');
    expect(text).toContain('Fix login bug');
  });

  // ── jira_search_issues ────────────────────────────────────────────

  it('jira_search_issues returns search results', async () => {
    mockClient.post.mockResolvedValueOnce({
      issues: [sampleIssue, sampleIssue2],
      startAt: 0,
      maxResults: 25,
      total: 2,
    });

    const result = await client.callTool({
      name: 'jira_search_issues',
      arguments: { jql: 'project = PROJ' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ-123');
    expect(text).toContain('PROJ-124');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/api/2/search',
      expect.objectContaining({ jql: 'project = PROJ' }),
    );
  });

  // ── jira_update_issue ─────────────────────────────────────────────

  it('jira_update_issue updates an issue successfully', async () => {
    mockClient.put.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_update_issue',
      arguments: {
        issueIdOrKey: 'PROJ-123',
        fields: { summary: 'Updated title' },
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ-123 updated successfully');
    expect(mockClient.put).toHaveBeenCalledWith(
      '/rest/api/2/issue/PROJ-123',
      { fields: { summary: 'Updated title' } },
    );
  });

  // ── jira_delete_issue ─────────────────────────────────────────────

  it('jira_delete_issue deletes an issue successfully', async () => {
    mockClient.delete.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_delete_issue',
      arguments: { issueIdOrKey: 'PROJ-123' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ-123 deleted successfully');
    expect(mockClient.delete).toHaveBeenCalledWith(
      '/rest/api/2/issue/PROJ-123?deleteSubtasks=false',
    );
  });

  // ── jira_transition_issue ─────────────────────────────────────────

  it('jira_transition_issue transitions an issue', async () => {
    mockClient.post.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_transition_issue',
      arguments: {
        issueIdOrKey: 'PROJ-123',
        transitionId: '21',
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ-123 transitioned successfully');
    expect(text).toContain('21');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/api/2/issue/PROJ-123/transitions',
      { transition: { id: '21' } },
    );
  });

  // ── jira_get_transitions ──────────────────────────────────────────

  it('jira_get_transitions returns available transitions', async () => {
    mockClient.get.mockResolvedValueOnce({ transitions: sampleTransitions });

    const result = await client.callTool({
      name: 'jira_get_transitions',
      arguments: { issueIdOrKey: 'PROJ-123' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Start Progress');
    expect(text).toContain('Done');
  });

  // ── jira_add_comment ──────────────────────────────────────────────

  it('jira_add_comment adds a comment', async () => {
    mockClient.post.mockResolvedValueOnce(sampleComment);

    const result = await client.callTool({
      name: 'jira_add_comment',
      arguments: {
        issueIdOrKey: 'PROJ-123',
        body: 'This is a test comment.',
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Comment added to PROJ-123');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/api/2/issue/PROJ-123/comment',
      { body: 'This is a test comment.' },
    );
  });

  // ── jira_get_comments ─────────────────────────────────────────────

  it('jira_get_comments returns comments', async () => {
    mockClient.get.mockResolvedValueOnce({
      comments: [sampleComment],
      startAt: 0,
      maxResults: 20,
      total: 1,
    });

    const result = await client.callTool({
      name: 'jira_get_comments',
      arguments: { issueIdOrKey: 'PROJ-123' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('This is a test comment.');
  });

  // ── Error case ────────────────────────────────────────────────────

  it('jira_create_issue returns error when API rejects', async () => {
    mockClient.post.mockRejectedValueOnce(
      new JiraApiError('Permission denied', 403),
    );

    const result = await client.callTool({
      name: 'jira_create_issue',
      arguments: {
        projectKey: 'PROJ',
        summary: 'Fail',
        issueType: 'Bug',
      },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('403');
    expect(text).toContain('Permission denied');
  });
});
