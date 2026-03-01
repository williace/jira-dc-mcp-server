import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from '../../helpers/mock-jira-client.js';

vi.mock('../../../src/services/jira-client.js', () => ({
  getJiraClient: () => mockClient,
  JiraClient: vi.fn(),
}));

import { createTestClient } from '../../helpers/test-server.js';
import { registerBoardTools } from '../../../src/tools/boards.js';
import { sampleBoard, sampleBoardConfig } from '../../helpers/fixtures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Board Tools', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const ctx = await createTestClient(registerBoardTools);
    client = ctx.client;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // ── jira_list_boards ──────────────────────────────────────────────

  it('jira_list_boards returns boards', async () => {
    mockClient.get.mockResolvedValueOnce({
      values: [sampleBoard],
      startAt: 0,
      maxResults: 50,
      isLast: true,
    });

    const result = await client.callTool({
      name: 'jira_list_boards',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ Board');
    expect(mockClient.get).toHaveBeenCalledWith(
      '/rest/agile/1.0/board',
      expect.objectContaining({ startAt: 0, maxResults: 50 }),
    );
  });

  // ── jira_get_board ────────────────────────────────────────────────

  it('jira_get_board returns board details', async () => {
    mockClient.get.mockResolvedValueOnce(sampleBoard);

    const result = await client.callTool({
      name: 'jira_get_board',
      arguments: { boardId: 42 },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ Board');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/agile/1.0/board/42');
  });

  // ── jira_get_board_configuration ──────────────────────────────────

  it('jira_get_board_configuration returns board config', async () => {
    mockClient.get.mockResolvedValueOnce(sampleBoardConfig);

    const result = await client.callTool({
      name: 'jira_get_board_configuration',
      arguments: { boardId: 42 },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('PROJ Board');
    expect(mockClient.get).toHaveBeenCalledWith(
      '/rest/agile/1.0/board/42/configuration',
    );
  });
});
