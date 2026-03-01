import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getJiraClient } from '../services/jira-client.js';
import { formatToolResponse, formatAttachment } from '../services/formatters.js';
import { buildErrorResult } from '../utils/errors.js';
import { ResponseFormatSchema, IssueIdOrKeySchema } from '../schemas/common.js';
import { API_PATHS } from '../constants.js';
import type { JiraAttachment } from '../types.js';

export function registerAttachmentTools(server: McpServer): void {

  // 1. jira_get_attachment
  server.registerTool(
    'jira_get_attachment',
    {
      title: 'Get Attachment',
      description: `Get attachment metadata by ID.

Args:
  - attachmentId (string, required): Attachment ID
  - response_format (string, optional): "markdown" (default) or "json"

Returns: Attachment metadata including filename, MIME type, size, author, and download URL.

Examples:
  - Get attachment: { attachmentId: "12345" }

Error handling:
  - 404: Attachment not found.
  - 403: No permission to view this attachment.`,
      inputSchema: z.object({
        attachmentId: z.string().min(1).describe('Attachment ID.'),
        response_format: ResponseFormatSchema,
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getJiraClient();
        const attachment = await client.get<JiraAttachment>(
          `${API_PATHS.CORE}/attachment/${encodeURIComponent(params.attachmentId)}`
        );
        return formatToolResponse(attachment, params.response_format, () => formatAttachment(attachment));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 2. jira_delete_attachment
  server.registerTool(
    'jira_delete_attachment',
    {
      title: 'Delete Attachment',
      description: `Delete an attachment by ID. This action is permanent and cannot be undone.

Args:
  - attachmentId (string, required): Attachment ID to delete

Returns: Confirmation that the attachment was deleted.

Examples:
  - Delete attachment: { attachmentId: "12345" }

Error handling:
  - 404: Attachment not found.
  - 403: No permission to delete this attachment.`,
      inputSchema: z.object({
        attachmentId: z.string().min(1).describe('Attachment ID to delete.'),
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getJiraClient();
        await client.delete(
          `${API_PATHS.CORE}/attachment/${encodeURIComponent(params.attachmentId)}`
        );
        return {
          content: [{ type: 'text' as const, text: `Attachment ${params.attachmentId} deleted successfully.` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 3. jira_add_attachment
  server.registerTool(
    'jira_add_attachment',
    {
      title: 'Add Attachment',
      description: `Upload a file attachment to a Jira issue. The file content must be provided as a base64-encoded string.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - filename (string, required): Name for the uploaded file (e.g., "screenshot.png")
  - content (string, required): File content as a base64-encoded string

Returns: Attachment metadata including ID, filename, size, and download URL.

Examples:
  - Upload text file: { issueIdOrKey: "PROJ-123", filename: "notes.txt", content: "SGVsbG8gV29ybGQ=" }

Error handling:
  - 404: Issue not found.
  - 403: No permission to add attachments to this issue.
  - 413: File too large. Check Jira's attachment size limit.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        filename: z.string().min(1).describe('Filename for the uploaded file.'),
        content: z.string().min(1).describe('File content as a base64-encoded string.'),
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getJiraClient();
        const buffer = Buffer.from(params.content, 'base64');
        const blob = new Blob([buffer]);
        const formData = new FormData();
        formData.append('file', blob, params.filename);

        const result = await client.postMultipart<JiraAttachment[]>(
          `${API_PATHS.CORE}/issue/${encodeURIComponent(params.issueIdOrKey)}/attachments`,
          formData
        );

        const attachment = Array.isArray(result) ? result[0] : result;
        return {
          content: [{
            type: 'text' as const,
            text: `Attachment uploaded: ${attachment?.filename ?? params.filename} (ID: ${attachment?.id ?? 'unknown'}, Size: ${attachment?.size ?? 0} bytes)`,
          }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );
}
