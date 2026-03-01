import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from '../../helpers/mock-jira-client.js';

vi.mock('../../../src/services/jira-client.js', () => ({
  getJiraClient: () => mockClient,
  JiraClient: vi.fn(),
}));

import { createTestClient } from '../../helpers/test-server.js';
import { registerAttachmentTools } from '../../../src/tools/attachments.js';
import { sampleAttachment } from '../../helpers/fixtures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Attachment Tools', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const ctx = await createTestClient(registerAttachmentTools);
    client = ctx.client;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // ── jira_get_attachment ───────────────────────────────────────────

  it('jira_get_attachment returns attachment metadata', async () => {
    mockClient.get.mockResolvedValueOnce(sampleAttachment);

    const result = await client.callTool({
      name: 'jira_get_attachment',
      arguments: { attachmentId: '60001' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('screenshot.png');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/attachment/60001');
  });

  // ── jira_delete_attachment ────────────────────────────────────────

  it('jira_delete_attachment deletes an attachment', async () => {
    mockClient.delete.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_delete_attachment',
      arguments: { attachmentId: '60001' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Attachment 60001 deleted successfully');
    expect(mockClient.delete).toHaveBeenCalledWith('/rest/api/2/attachment/60001');
  });

  // ── jira_add_attachment ───────────────────────────────────────────

  it('jira_add_attachment uploads an attachment', async () => {
    mockClient.postMultipart.mockResolvedValueOnce([sampleAttachment]);

    const result = await client.callTool({
      name: 'jira_add_attachment',
      arguments: {
        issueIdOrKey: 'PROJ-123',
        filename: 'screenshot.png',
        content: Buffer.from('fake image data').toString('base64'),
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('screenshot.png');
    expect(text).toContain('60001');
    expect(mockClient.postMultipart).toHaveBeenCalledWith(
      '/rest/api/2/issue/PROJ-123/attachments',
      expect.any(FormData),
    );
  });
});
