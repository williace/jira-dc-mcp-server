/**
 * Epic management tools (5 tools). Get/update epics, list epic issues, and
 * move issues between epics. All operations use the Jira Agile REST API v1.0.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getJiraClient } from '../services/jira-client.js';
import { formatToolResponse, formatEpic, formatIssueList } from '../services/formatters.js';
import { buildErrorResult } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { PaginationSchema, ResponseFormatSchema } from '../schemas/common.js';
import { API_PATHS } from '../constants.js';
import type { JiraEpic, JiraIssue } from '../types.js';

/** Registers all epic-related tools on the MCP server. */
export function registerEpicTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // 1. jira_get_epic
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_epic',
    `Get details for a single epic by its ID or issue key.

Args:
  epicIdOrKey: The numeric ID or issue key (e.g., "PROJ-100") of the epic.
  response_format: "markdown" (default) or "json".

Returns:
  Epic details including key, name, summary, done status, and color.

Examples:
  - By key: { epicIdOrKey: "PROJ-100" }
  - By ID: { epicIdOrKey: "10500" }

Error handling:
  Returns a 404 if the epic does not exist or is not accessible.`,
    {
      epicIdOrKey: z.string().min(1)
        .describe('Epic ID (numeric) or issue key (e.g., "PROJ-100").'),
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ epicIdOrKey, response_format }) => {
      try {
        const client = getJiraClient();
        const data = await client.get<JiraEpic>(`${API_PATHS.AGILE}/epic/${epicIdOrKey}`);

        return formatToolResponse(data, response_format, () => formatEpic(data));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2. jira_update_epic
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_update_epic',
    `Update an existing epic. Only the fields you provide will be changed.

Args:
  epicIdOrKey: The numeric ID or issue key of the epic to update (required).
  name: New name for the epic.
  summary: New summary for the epic.
  done: Set to true to mark the epic as done, false to mark it as not done.

Returns:
  The updated epic object with all current fields.

Examples:
  - Rename: { epicIdOrKey: "PROJ-100", name: "New Epic Name" }
  - Mark as done: { epicIdOrKey: "PROJ-100", done: true }
  - Update summary: { epicIdOrKey: "PROJ-100", summary: "Revised scope for Q2" }
  - Multiple fields: { epicIdOrKey: "PROJ-100", name: "Auth Epic", summary: "All authentication work", done: false }

Error handling:
  Returns a 404 if the epic does not exist, 400 for invalid field values, or 403 if you lack permission.`,
    {
      epicIdOrKey: z.string().min(1)
        .describe('Epic ID (numeric) or issue key (e.g., "PROJ-100").'),
      name: z.string().min(1).optional()
        .describe('New name for the epic.'),
      summary: z.string().min(1).optional()
        .describe('New summary for the epic.'),
      done: z.boolean().optional()
        .describe('Set to true to mark epic as done, false to reopen.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ epicIdOrKey, name, summary, done }) => {
      try {
        const client = getJiraClient();
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (summary !== undefined) body.summary = summary;
        if (done !== undefined) body.done = done;

        const data = await client.post<JiraEpic>(`${API_PATHS.AGILE}/epic/${epicIdOrKey}`, body);

        return formatToolResponse(data, 'json', () => formatEpic(data));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 3. jira_get_epic_issues
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_epic_issues',
    `List issues belonging to an epic with optional JQL filtering.

Args:
  epicIdOrKey: The numeric ID or issue key of the epic.
  startAt: Pagination offset (0-based, default 0).
  maxResults: Page size (1-100, default 50).
  jql: Optional JQL expression to further filter the issues in the epic.
  fields: Optional list of field names to include (e.g., ["summary","status"]).
  response_format: "markdown" (default) or "json".

Returns:
  A paginated list of issues in the epic with key, summary, status, priority, and assignee.

Examples:
  - All issues in epic: { epicIdOrKey: "PROJ-100" }
  - Filtered: { epicIdOrKey: "PROJ-100", jql: "status != Done" }
  - With specific fields: { epicIdOrKey: "PROJ-100", fields: ["summary", "status", "assignee"] }

Error handling:
  Returns a 404 if the epic does not exist or a 400 if the JQL is invalid.`,
    {
      epicIdOrKey: z.string().min(1)
        .describe('Epic ID (numeric) or issue key (e.g., "PROJ-100").'),
      ...PaginationSchema,
      jql: z.string().optional()
        .describe('JQL expression to filter issues within the epic.'),
      fields: z.array(z.string()).optional()
        .describe('List of field names to include in the response.'),
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ epicIdOrKey, startAt, maxResults, jql, fields, response_format }) => {
      try {
        const client = getJiraClient();
        const params: Record<string, unknown> = { startAt, maxResults };
        if (jql) params.jql = jql;
        if (fields) params.fields = fields.join(',');

        const data = await client.get<{
          issues: JiraIssue[];
          startAt: number;
          maxResults: number;
          total?: number;
          isLast?: boolean;
        }>(`${API_PATHS.AGILE}/epic/${epicIdOrKey}/issue`, params);

        const issues = data.issues ?? [];
        const total = data.total ?? (data.isLast ? data.startAt + issues.length : data.startAt + issues.length + 1);
        const pagination = buildPaginationMeta(data.startAt, data.maxResults, total);

        return formatToolResponse(
          { issues, pagination },
          response_format,
          () => formatIssueList(issues, pagination),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 4. jira_move_issues_to_epic
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_move_issues_to_epic',
    `Move one or more issues into an epic. Issues can be specified by key (e.g., "PROJ-123") or numeric ID.

Args:
  epicIdOrKey: The numeric ID or issue key of the target epic (required).
  issues: An array of issue keys or IDs to add to the epic (required, at least one).

Returns:
  A confirmation message indicating the issues were moved successfully.

Examples:
  - Move one issue: { epicIdOrKey: "PROJ-100", issues: ["PROJ-123"] }
  - Move multiple: { epicIdOrKey: "PROJ-100", issues: ["PROJ-123", "PROJ-124", "PROJ-125"] }

Error handling:
  Returns a 404 if the epic or any issue does not exist, or 403 if you lack permission.`,
    {
      epicIdOrKey: z.string().min(1)
        .describe('Epic ID (numeric) or issue key (e.g., "PROJ-100").'),
      issues: z.array(z.string().min(1)).min(1)
        .describe('Array of issue keys or IDs to move into the epic.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ epicIdOrKey, issues }) => {
      try {
        const client = getJiraClient();
        await client.post(`${API_PATHS.AGILE}/epic/${epicIdOrKey}/issue`, { issues });

        return {
          content: [{
            type: 'text' as const,
            text: `Successfully moved ${issues.length} issue(s) to epic ${epicIdOrKey}: ${issues.join(', ')}`,
          }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 5. jira_remove_issues_from_epic
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_remove_issues_from_epic',
    `Remove one or more issues from their current epic, leaving them unassigned to any epic. Issues can be specified by key or numeric ID.

Args:
  issues: An array of issue keys or IDs to remove from their epic (required, at least one).

Returns:
  A confirmation message indicating the issues were removed from their epic.

Examples:
  - Remove one issue: { issues: ["PROJ-123"] }
  - Remove multiple: { issues: ["PROJ-123", "PROJ-124"] }

Error handling:
  Returns a 404 if any issue does not exist or 403 if you lack permission.`,
    {
      issues: z.array(z.string().min(1)).min(1)
        .describe('Array of issue keys or IDs to remove from their current epic.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ issues }) => {
      try {
        const client = getJiraClient();
        await client.post(`${API_PATHS.AGILE}/epic/none/issue`, { issues });

        return {
          content: [{
            type: 'text' as const,
            text: `Successfully removed ${issues.length} issue(s) from their epic: ${issues.join(', ')}`,
          }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );
}
