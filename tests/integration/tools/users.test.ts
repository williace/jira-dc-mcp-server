import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from '../../helpers/mock-jira-client.js';

vi.mock('../../../src/services/jira-client.js', () => ({
  getJiraClient: () => mockClient,
  JiraClient: vi.fn(),
}));

import { createTestClient } from '../../helpers/test-server.js';
import { registerUserTools } from '../../../src/tools/users.js';
import { sampleUser, sampleUser2 } from '../../helpers/fixtures.js';
import { JiraApiError } from '../../../src/utils/errors.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('User Tools', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const ctx = await createTestClient(registerUserTools);
    client = ctx.client;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // ── jira_get_user ──────────────────────────────────────────────────

  it('jira_get_user returns user details', async () => {
    mockClient.get.mockResolvedValueOnce(sampleUser);

    const result = await client.callTool({
      name: 'jira_get_user',
      arguments: { username: 'jsmith' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('John Smith');
    expect(mockClient.get).toHaveBeenCalledWith(
      '/rest/api/2/user',
      { username: 'jsmith' },
    );
  });

  // ── jira_search_users ─────────────────────────────────────────────

  it('jira_search_users returns matching users', async () => {
    mockClient.get.mockResolvedValueOnce([sampleUser, sampleUser2]);

    const result = await client.callTool({
      name: 'jira_search_users',
      arguments: { query: 'j' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('John Smith');
    expect(text).toContain('Jane Doe');
  });

  // ── jira_get_myself ───────────────────────────────────────────────

  it('jira_get_myself returns current user', async () => {
    mockClient.get.mockResolvedValueOnce(sampleUser);

    const result = await client.callTool({
      name: 'jira_get_myself',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('John Smith');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/myself');
  });

  // ── Error case ────────────────────────────────────────────────────

  it('jira_get_user returns error on 404', async () => {
    mockClient.get.mockRejectedValueOnce(
      new JiraApiError('User not found', 404),
    );

    const result = await client.callTool({
      name: 'jira_get_user',
      arguments: { username: 'nonexistent' },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('404');
    expect(text).toContain('User not found');
  });
});
