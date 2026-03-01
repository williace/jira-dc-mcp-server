/**
 * Sprint management tools (7 tools). Create, read, update, and delete sprints.
 * List sprint issues, move issues into sprints or back to the backlog. All
 * operations use the Jira Agile REST API v1.0.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getJiraClient } from '../services/jira-client.js';
import { formatToolResponse, formatSprint, formatSprintList, formatIssueList } from '../services/formatters.js';
import { buildErrorResult } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { PaginationSchema, ResponseFormatSchema, SprintIdSchema, BoardIdSchema } from '../schemas/common.js';
import { API_PATHS } from '../constants.js';
import type { JiraSprint, JiraIssue } from '../types.js';

/** Registers all sprint-related tools on the MCP server. */
export function registerSprintTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // 1. jira_create_sprint
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_create_sprint',
    `Create a new sprint for an agile board.

Args:
  name: The name of the sprint (required).
  originBoardId: The numeric ID of the board this sprint belongs to (required).
  startDate: Optional ISO 8601 date-time string for the sprint start (e.g., "2026-03-02T09:00:00.000Z").
  endDate: Optional ISO 8601 date-time string for the sprint end (e.g., "2026-03-16T17:00:00.000Z").
  goal: Optional sprint goal description.

Returns:
  The newly created sprint object with its ID, name, state, dates, and goal.

Examples:
  - Minimal: { name: "Sprint 10", originBoardId: 42 }
  - With dates and goal: { name: "Sprint 10", originBoardId: 42, startDate: "2026-03-02T09:00:00.000Z", endDate: "2026-03-16T17:00:00.000Z", goal: "Complete auth module" }

Error handling:
  Returns a 404 if the board does not exist, 400 if the name is missing, or 403 if you lack permission to manage sprints.`,
    {
      name: z.string().min(1)
        .describe('Name of the sprint.'),
      originBoardId: BoardIdSchema
        .describe('Numeric ID of the board this sprint belongs to.'),
      startDate: z.string().optional()
        .describe('Sprint start date in ISO 8601 format (e.g., "2026-03-02T09:00:00.000Z").'),
      endDate: z.string().optional()
        .describe('Sprint end date in ISO 8601 format (e.g., "2026-03-16T17:00:00.000Z").'),
      goal: z.string().optional()
        .describe('Sprint goal description.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ name, originBoardId, startDate, endDate, goal }) => {
      try {
        const client = getJiraClient();
        const body: Record<string, unknown> = { name, originBoardId };
        if (startDate) body.startDate = startDate;
        if (endDate) body.endDate = endDate;
        if (goal) body.goal = goal;

        const data = await client.post<JiraSprint>(`${API_PATHS.AGILE}/sprint`, body);

        return formatToolResponse(data, 'json', () => formatSprint(data));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2. jira_get_sprint
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_sprint',
    `Get details for a single sprint by its ID.

Args:
  sprintId: The numeric ID of the sprint.
  response_format: "markdown" (default) or "json".

Returns:
  Sprint details including name, state, start/end/complete dates, board ID, and goal.

Examples:
  - Get sprint 100: { sprintId: 100 }

Error handling:
  Returns a 404 if the sprint does not exist or is not accessible.`,
    {
      sprintId: SprintIdSchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ sprintId, response_format }) => {
      try {
        const client = getJiraClient();
        const data = await client.get<JiraSprint>(`${API_PATHS.AGILE}/sprint/${sprintId}`);

        return formatToolResponse(data, response_format, () => formatSprint(data));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 3. jira_update_sprint
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_update_sprint',
    `Update an existing sprint. Only the fields you provide will be changed.

Args:
  sprintId: The numeric ID of the sprint to update (required).
  name: New name for the sprint.
  state: New state for the sprint ("active", "closed", or "future"). Use "active" to start a sprint and "closed" to complete it.
  startDate: New start date in ISO 8601 format.
  endDate: New end date in ISO 8601 format.
  goal: New sprint goal description.

Returns:
  The updated sprint object with all current fields.

Examples:
  - Rename: { sprintId: 100, name: "Sprint 10 - Extended" }
  - Start a sprint: { sprintId: 100, state: "active", startDate: "2026-03-02T09:00:00.000Z", endDate: "2026-03-16T17:00:00.000Z" }
  - Close a sprint: { sprintId: 100, state: "closed" }
  - Update goal: { sprintId: 100, goal: "Ship MVP" }

Error handling:
  Returns a 404 if the sprint does not exist, 400 for invalid state transitions, or 403 if you lack permission.`,
    {
      sprintId: SprintIdSchema,
      name: z.string().min(1).optional()
        .describe('New name for the sprint.'),
      state: z.enum(['active', 'closed', 'future']).optional()
        .describe('New sprint state: "active" to start, "closed" to complete, "future" to reopen.'),
      startDate: z.string().optional()
        .describe('New sprint start date in ISO 8601 format.'),
      endDate: z.string().optional()
        .describe('New sprint end date in ISO 8601 format.'),
      goal: z.string().optional()
        .describe('New sprint goal description.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ sprintId, name, state, startDate, endDate, goal }) => {
      try {
        const client = getJiraClient();
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (state !== undefined) body.state = state;
        if (startDate !== undefined) body.startDate = startDate;
        if (endDate !== undefined) body.endDate = endDate;
        if (goal !== undefined) body.goal = goal;

        const data = await client.put<JiraSprint>(`${API_PATHS.AGILE}/sprint/${sprintId}`, body);

        return formatToolResponse(data, 'json', () => formatSprint(data));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 4. jira_delete_sprint
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_delete_sprint',
    `Delete a sprint permanently. Issues in the sprint will be moved back to the backlog.

Args:
  sprintId: The numeric ID of the sprint to delete (required).

Returns:
  A confirmation message that the sprint was deleted.

Examples:
  - Delete sprint 100: { sprintId: 100 }

Error handling:
  Returns a 404 if the sprint does not exist or 403 if you lack permission to delete sprints.`,
    {
      sprintId: SprintIdSchema,
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ sprintId }) => {
      try {
        const client = getJiraClient();
        await client.delete(`${API_PATHS.AGILE}/sprint/${sprintId}`);

        return {
          content: [{ type: 'text' as const, text: `Sprint ${sprintId} deleted successfully.` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 5. jira_get_sprint_issues
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_sprint_issues',
    `List issues in a sprint with optional JQL filtering.

Args:
  sprintId: The numeric ID of the sprint.
  jql: Optional JQL expression to further filter the issues in the sprint.
  startAt: Pagination offset (0-based, default 0).
  maxResults: Page size (1-100, default 50).
  fields: Optional list of field names to include (e.g., ["summary","status"]).
  response_format: "markdown" (default) or "json".

Returns:
  A paginated list of issues in the sprint with key, summary, status, priority, and assignee.

Examples:
  - All issues in sprint 100: { sprintId: 100 }
  - Filtered: { sprintId: 100, jql: "assignee = currentUser()" }
  - With specific fields: { sprintId: 100, fields: ["summary", "status", "story_points"] }

Error handling:
  Returns a 404 if the sprint does not exist or a 400 if the JQL is invalid.`,
    {
      sprintId: SprintIdSchema,
      jql: z.string().optional()
        .describe('JQL expression to filter issues within the sprint.'),
      ...PaginationSchema,
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
    async ({ sprintId, jql, startAt, maxResults, fields, response_format }) => {
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
        }>(`${API_PATHS.AGILE}/sprint/${sprintId}/issue`, params);

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
  // 6. jira_move_issues_to_sprint
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_move_issues_to_sprint',
    `Move one or more issues into a sprint. Issues can be specified by key (e.g., "PROJ-123") or numeric ID.

Args:
  sprintId: The numeric ID of the target sprint (required).
  issues: An array of issue keys or IDs to move into the sprint (required, at least one).

Returns:
  A confirmation message indicating the issues were moved successfully.

Examples:
  - Move one issue: { sprintId: 100, issues: ["PROJ-123"] }
  - Move multiple: { sprintId: 100, issues: ["PROJ-123", "PROJ-124", "PROJ-125"] }

Error handling:
  Returns a 404 if the sprint or any issue does not exist, or 403 if you lack permission.`,
    {
      sprintId: SprintIdSchema,
      issues: z.array(z.string().min(1)).min(1)
        .describe('Array of issue keys or IDs to move into the sprint.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ sprintId, issues }) => {
      try {
        const client = getJiraClient();
        await client.post(`${API_PATHS.AGILE}/sprint/${sprintId}/issue`, { issues });

        return {
          content: [{
            type: 'text' as const,
            text: `Successfully moved ${issues.length} issue(s) to sprint ${sprintId}: ${issues.join(', ')}`,
          }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 7. jira_move_issues_to_backlog
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_move_issues_to_backlog',
    `Move one or more issues to the backlog, removing them from any sprint. Issues can be specified by key or numeric ID.

Args:
  issues: An array of issue keys or IDs to move to the backlog (required, at least one).

Returns:
  A confirmation message indicating the issues were moved to the backlog.

Examples:
  - Move one issue: { issues: ["PROJ-123"] }
  - Move multiple: { issues: ["PROJ-123", "PROJ-124"] }

Error handling:
  Returns a 404 if any issue does not exist or 403 if you lack permission.`,
    {
      issues: z.array(z.string().min(1)).min(1)
        .describe('Array of issue keys or IDs to move to the backlog.'),
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
        await client.post(`${API_PATHS.AGILE}/backlog/issue`, { issues });

        return {
          content: [{
            type: 'text' as const,
            text: `Successfully moved ${issues.length} issue(s) to the backlog: ${issues.join(', ')}`,
          }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );
}
