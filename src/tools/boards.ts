import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getJiraClient } from '../services/jira-client.js';
import { formatToolResponse, formatBoard, formatBoardList, formatBoardConfig, formatIssueList, formatSprintList, formatEpicList } from '../services/formatters.js';
import { buildErrorResult } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { PaginationSchema, ResponseFormatSchema, BoardIdSchema } from '../schemas/common.js';
import { API_PATHS } from '../constants.js';
import type { JiraBoard, JiraBoardConfiguration, JiraIssue, JiraSprint, JiraEpic } from '../types.js';

export function registerBoardTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // 1. jira_list_boards
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_list_boards',
    `List all boards visible to the current user from the Jira Agile API.

Args:
  type: Optional board type filter ("scrum", "kanban", or "simple").
  name: Optional name filter (substring match, case-insensitive).
  startAt: Pagination offset (0-based, default 0).
  maxResults: Page size (1-100, default 50).
  response_format: "markdown" (default) or "json".

Returns:
  A paginated list of boards with their IDs, names, types, and project locations.

Examples:
  - List all boards: {}
  - List scrum boards: { type: "scrum" }
  - Search by name: { name: "Frontend" }
  - Page 2 of results: { startAt: 50, maxResults: 50 }

Error handling:
  Returns an error message if the Agile API is unreachable or if authentication fails.`,
    {
      type: z.enum(['scrum', 'kanban', 'simple']).optional()
        .describe('Filter boards by type: "scrum", "kanban", or "simple".'),
      name: z.string().optional()
        .describe('Filter boards by name (substring match, case-insensitive).'),
      ...PaginationSchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ type, name, startAt, maxResults, response_format }) => {
      try {
        const client = getJiraClient();
        const params: Record<string, unknown> = { startAt, maxResults };
        if (type) params.type = type;
        if (name) params.name = name;

        const data = await client.get<{
          values: JiraBoard[];
          startAt: number;
          maxResults: number;
          total?: number;
          isLast?: boolean;
        }>(`${API_PATHS.AGILE}/board`, params);

        const values = data.values ?? [];
        const total = data.total ?? (data.isLast ? data.startAt + values.length : data.startAt + values.length + 1);
        const pagination = buildPaginationMeta(data.startAt, data.maxResults, total);

        return formatToolResponse(
          { boards: values, pagination },
          response_format,
          () => formatBoardList(values, pagination),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 2. jira_get_board
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_board',
    `Get details for a single board by its ID.

Args:
  boardId: The numeric ID of the board.
  response_format: "markdown" (default) or "json".

Returns:
  Board details including name, type, and associated project location.

Examples:
  - Get board 42: { boardId: 42 }

Error handling:
  Returns a 404 error if the board does not exist or is not accessible.`,
    {
      boardId: BoardIdSchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ boardId, response_format }) => {
      try {
        const client = getJiraClient();
        const data = await client.get<JiraBoard>(`${API_PATHS.AGILE}/board/${boardId}`);

        return formatToolResponse(data, response_format, () => formatBoard(data));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 3. jira_get_board_configuration
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_board_configuration',
    `Get the configuration of a board including columns, estimation, and filter settings.

Args:
  boardId: The numeric ID of the board.
  response_format: "markdown" (default) or "json".

Returns:
  Board configuration with column mappings, estimation type, filter ID, and ranking field.

Examples:
  - Get config for board 42: { boardId: 42 }

Error handling:
  Returns a 404 error if the board does not exist or a 403 if you lack permission.`,
    {
      boardId: BoardIdSchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ boardId, response_format }) => {
      try {
        const client = getJiraClient();
        const data = await client.get<JiraBoardConfiguration>(
          `${API_PATHS.AGILE}/board/${boardId}/configuration`,
        );

        return formatToolResponse(data, response_format, () => formatBoardConfig(data));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 4. jira_get_board_issues
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_board_issues',
    `List issues on a board with optional JQL filtering.

Args:
  boardId: The numeric ID of the board.
  jql: Optional JQL expression to filter the issues returned.
  startAt: Pagination offset (0-based, default 0).
  maxResults: Page size (1-100, default 50).
  fields: Optional list of field names to include (e.g., ["summary","status"]).
  response_format: "markdown" (default) or "json".

Returns:
  A paginated list of issues on the board with key, summary, status, priority, and assignee.

Examples:
  - All issues on board 42: { boardId: 42 }
  - Filtered: { boardId: 42, jql: "status = 'In Progress'" }
  - With specific fields: { boardId: 42, fields: ["summary", "status", "assignee"] }

Error handling:
  Returns an error if the board does not exist or the JQL is invalid.`,
    {
      boardId: BoardIdSchema,
      jql: z.string().optional()
        .describe('JQL expression to filter issues on the board.'),
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
    async ({ boardId, jql, startAt, maxResults, fields, response_format }) => {
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
        }>(`${API_PATHS.AGILE}/board/${boardId}/issue`, params);

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
  // 5. jira_get_board_backlog
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_board_backlog',
    `List issues in the backlog of a board with optional JQL filtering.

Args:
  boardId: The numeric ID of the board.
  jql: Optional JQL expression to filter the backlog issues.
  startAt: Pagination offset (0-based, default 0).
  maxResults: Page size (1-100, default 50).
  fields: Optional list of field names to include (e.g., ["summary","status"]).
  response_format: "markdown" (default) or "json".

Returns:
  A paginated list of backlog issues with key, summary, status, priority, and assignee.

Examples:
  - Backlog for board 42: { boardId: 42 }
  - Filtered backlog: { boardId: 42, jql: "priority = High" }

Error handling:
  Returns an error if the board does not exist, the backlog is not enabled, or the JQL is invalid.`,
    {
      boardId: BoardIdSchema,
      jql: z.string().optional()
        .describe('JQL expression to filter backlog issues.'),
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
    async ({ boardId, jql, startAt, maxResults, fields, response_format }) => {
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
        }>(`${API_PATHS.AGILE}/board/${boardId}/backlog`, params);

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
  // 6. jira_get_board_sprints
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_board_sprints',
    `List sprints for a board with optional state filtering.

Args:
  boardId: The numeric ID of the board.
  state: Optional sprint state filter ("future", "active", or "closed").
  startAt: Pagination offset (0-based, default 0).
  maxResults: Page size (1-100, default 50).
  response_format: "markdown" (default) or "json".

Returns:
  A paginated list of sprints with their IDs, names, states, dates, and goals.

Examples:
  - All sprints for board 42: { boardId: 42 }
  - Active sprints only: { boardId: 42, state: "active" }
  - Closed sprints: { boardId: 42, state: "closed" }

Error handling:
  Returns a 404 if the board does not exist or a 400 if the board does not support sprints (e.g., kanban).`,
    {
      boardId: BoardIdSchema,
      state: z.enum(['future', 'active', 'closed']).optional()
        .describe('Filter sprints by state: "future", "active", or "closed".'),
      ...PaginationSchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ boardId, state, startAt, maxResults, response_format }) => {
      try {
        const client = getJiraClient();
        const params: Record<string, unknown> = { startAt, maxResults };
        if (state) params.state = state;

        const data = await client.get<{
          values: JiraSprint[];
          startAt: number;
          maxResults: number;
          total?: number;
          isLast?: boolean;
        }>(`${API_PATHS.AGILE}/board/${boardId}/sprint`, params);

        const values = data.values ?? [];
        const total = data.total ?? (data.isLast ? data.startAt + values.length : data.startAt + values.length + 1);
        const pagination = buildPaginationMeta(data.startAt, data.maxResults, total);

        return formatToolResponse(
          { sprints: values, pagination },
          response_format,
          () => formatSprintList(values, pagination),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // 7. jira_get_board_epics
  // ---------------------------------------------------------------------------
  server.tool(
    'jira_get_board_epics',
    `List epics for a board.

Args:
  boardId: The numeric ID of the board.
  startAt: Pagination offset (0-based, default 0).
  maxResults: Page size (1-100, default 50).
  response_format: "markdown" (default) or "json".

Returns:
  A paginated list of epics associated with the board, including key, name, summary, and done status.

Examples:
  - All epics on board 42: { boardId: 42 }
  - Second page: { boardId: 42, startAt: 50 }

Error handling:
  Returns a 404 if the board does not exist or a 403 if you lack permission.`,
    {
      boardId: BoardIdSchema,
      ...PaginationSchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ boardId, startAt, maxResults, response_format }) => {
      try {
        const client = getJiraClient();
        const params: Record<string, unknown> = { startAt, maxResults };

        const data = await client.get<{
          values: JiraEpic[];
          startAt: number;
          maxResults: number;
          total?: number;
          isLast?: boolean;
        }>(`${API_PATHS.AGILE}/board/${boardId}/epic`, params);

        const values = data.values ?? [];
        const total = data.total ?? (data.isLast ? data.startAt + values.length : data.startAt + values.length + 1);
        const pagination = buildPaginationMeta(data.startAt, data.maxResults, total);

        return formatToolResponse(
          { epics: values, pagination },
          response_format,
          () => formatEpicList(values, pagination),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );
}
