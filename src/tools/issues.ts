import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getJiraClient } from '../services/jira-client.js';
import { formatToolResponse, formatIssue, formatIssueList, formatCommentList, formatComment, formatWorklogList, formatTransitionList, formatRemoteLinkList, formatWatcherList } from '../services/formatters.js';
import { buildErrorResult } from '../utils/errors.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { PaginationSchema, ResponseFormatSchema, IssueIdOrKeySchema, JqlSchema, FieldsSchema, ExpandSchema, VisibilitySchema } from '../schemas/common.js';
import { API_PATHS, DEFAULTS } from '../constants.js';
import type { JiraIssue, JiraSearchResult, JiraComment, JiraWorklog, JiraTransition, JiraRemoteLink, JiraUser } from '../types.js';

export function registerIssueTools(server: McpServer): void {
  // ── 1. jira_create_issue ──────────────────────────────────────────────
  server.registerTool(
    'jira_create_issue',
    {
      title: 'Create Issue',
      description: `Create a new Jira issue in a project.

Args:
  - projectKey (string, required): Project key (e.g., "PROJ")
  - summary (string, required): Issue summary/title
  - issueType (string, required): Issue type name (e.g., "Bug", "Story", "Task")
  - description (string, optional): Issue description
  - assignee (string, optional): Assignee username
  - priority (string, optional): Priority name (e.g., "High", "Medium")
  - labels (string[], optional): Labels to apply
  - components (string[], optional): Component names
  - fixVersions (string[], optional): Fix version names
  - customFields (object, optional): Custom fields as key-value pairs

Returns: Created issue key and self URL.

Examples:
  - Minimal: { projectKey: "PROJ", summary: "Fix login bug", issueType: "Bug" }
  - Full: { projectKey: "PROJ", summary: "New feature", issueType: "Story", assignee: "jsmith", priority: "High", labels: ["frontend"] }

Error handling:
  - 400: Invalid field values or missing required fields.
  - 403: No permission to create issues in this project.`,
      inputSchema: z.object({
        projectKey: z.string().min(1).describe('Project key (e.g., "PROJ").'),
        summary: z.string().min(1).describe('Issue summary/title.'),
        issueType: z.string().min(1).describe('Issue type name (e.g., "Bug", "Story", "Task").'),
        description: z.string().optional().describe('Issue description.'),
        assignee: z.string().optional().describe('Assignee username.'),
        priority: z.string().optional().describe('Priority name (e.g., "High", "Medium").'),
        labels: z.array(z.string()).optional().describe('Labels to apply.'),
        components: z.array(z.string()).optional().describe('Component names.'),
        fixVersions: z.array(z.string()).optional().describe('Fix version names.'),
        customFields: z.record(z.string(), z.unknown()).optional().describe('Custom fields as key-value pairs.'),
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
        const fields: Record<string, unknown> = {
          project: { key: params.projectKey },
          summary: params.summary,
          issuetype: { name: params.issueType },
        };
        if (params.description !== undefined) {
          fields.description = params.description;
        }
        if (params.assignee !== undefined) {
          fields.assignee = { name: params.assignee };
        }
        if (params.priority !== undefined) {
          fields.priority = { name: params.priority };
        }
        if (params.labels !== undefined) {
          fields.labels = params.labels;
        }
        if (params.components !== undefined) {
          fields.components = params.components.map((name) => ({ name }));
        }
        if (params.fixVersions !== undefined) {
          fields.fixVersions = params.fixVersions.map((name) => ({ name }));
        }
        if (params.customFields) {
          Object.assign(fields, params.customFields);
        }

        const result = await client.post<{ id: string; key: string; self: string }>(
          `${API_PATHS.CORE}/issue`,
          { fields },
        );

        return {
          content: [{ type: 'text' as const, text: `Issue created: ${result.key} (${result.self})` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 2. jira_get_issue ─────────────────────────────────────────────────
  server.registerTool(
    'jira_get_issue',
    {
      title: 'Get Issue',
      description: `Get full details of a Jira issue by key or ID.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - fields (string[], optional): Fields to include. Use "*all" for all fields
  - expand (string[], optional): Expand parameters (e.g., ["renderedFields", "changelog"])
  - response_format (string, optional): "markdown" (default) or "json"

Returns: Issue details including summary, status, assignee, priority, description, and more.

Examples:
  - Get issue: { issueIdOrKey: "PROJ-123" }
  - Get with specific fields: { issueIdOrKey: "PROJ-123", fields: ["summary", "status", "assignee"] }

Error handling:
  - 404: Issue not found. Verify the key is correct.
  - 403: No permission to view this issue.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        fields: FieldsSchema,
        expand: ExpandSchema,
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
        const queryParams: Record<string, unknown> = {};
        if (params.fields?.length) {
          queryParams.fields = params.fields.join(',');
        }
        if (params.expand?.length) {
          queryParams.expand = params.expand.join(',');
        }

        const issue = await client.get<JiraIssue>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}`,
          queryParams,
        );

        return formatToolResponse(issue, params.response_format, () => formatIssue(issue));
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 3. jira_update_issue ──────────────────────────────────────────────
  server.registerTool(
    'jira_update_issue',
    {
      title: 'Update Issue',
      description: `Update an existing Jira issue's fields.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - fields (object, optional): Fields to set (e.g., { "summary": "New title", "priority": { "name": "High" } })
  - update (object, optional): Update operations (e.g., { "labels": [{ "add": "critical" }] })

Returns: Confirmation that the issue was updated.

Examples:
  - Update summary: { issueIdOrKey: "PROJ-123", fields: { "summary": "Updated title" } }
  - Add label: { issueIdOrKey: "PROJ-123", update: { "labels": [{ "add": "urgent" }] } }

Error handling:
  - 404: Issue not found.
  - 400: Invalid field names or values.
  - 403: No permission to edit this issue.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        fields: z.record(z.string(), z.unknown()).optional().describe('Fields to set directly.'),
        update: z.record(z.string(), z.unknown()).optional().describe('Update operations for fields.'),
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getJiraClient();
        const body: Record<string, unknown> = {};
        if (params.fields && Object.keys(params.fields).length > 0) {
          body.fields = params.fields;
        }
        if (params.update && Object.keys(params.update).length > 0) {
          body.update = params.update;
        }

        await client.put<void>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}`,
          body,
        );

        return {
          content: [{ type: 'text' as const, text: `Issue ${params.issueIdOrKey} updated successfully.` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 4. jira_delete_issue ──────────────────────────────────────────────
  server.registerTool(
    'jira_delete_issue',
    {
      title: 'Delete Issue',
      description: `Delete a Jira issue by key or ID.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - deleteSubtasks (boolean, optional): Whether to delete subtasks (default: false)

Returns: Confirmation that the issue was deleted.

Examples:
  - Delete issue: { issueIdOrKey: "PROJ-123" }
  - Delete with subtasks: { issueIdOrKey: "PROJ-123", deleteSubtasks: true }

Error handling:
  - 404: Issue not found.
  - 403: No permission to delete this issue.
  - 400: Issue has subtasks and deleteSubtasks is false.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        deleteSubtasks: z.boolean().default(false).describe('Whether to delete subtasks (default: false).'),
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

        await client.delete<void>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}?deleteSubtasks=${params.deleteSubtasks}`,
        );

        return {
          content: [{ type: 'text' as const, text: `Issue ${params.issueIdOrKey} deleted successfully.` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 5. jira_search_issues ─────────────────────────────────────────────
  server.registerTool(
    'jira_search_issues',
    {
      title: 'Search Issues',
      description: `Search for Jira issues using JQL (Jira Query Language).

Args:
  - jql (string, required): JQL query string (e.g., 'project = PROJ AND status = "In Progress"')
  - startAt (number, optional): Pagination start index (default: 0)
  - maxResults (number, optional): Max results per page (default: 25)
  - fields (string[], optional): Fields to include
  - expand (string[], optional): Expand parameters
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of matching issues with pagination info.

Examples:
  - Simple search: { jql: "project = PROJ" }
  - Filtered search: { jql: "assignee = currentUser() AND status != Done", maxResults: 10 }

Error handling:
  - 400: Invalid JQL syntax.
  - 403: No permission to execute this query.`,
      inputSchema: z.object({
        jql: JqlSchema,
        startAt: PaginationSchema.startAt,
        maxResults: z.number().int().min(1).max(100).default(DEFAULTS.SEARCH_MAX_RESULTS)
          .describe('Maximum number of results to return per page (1-100, default 25).'),
        fields: FieldsSchema,
        expand: ExpandSchema,
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
        const body: Record<string, unknown> = {
          jql: params.jql,
          startAt: params.startAt,
          maxResults: params.maxResults,
        };
        if (params.fields?.length) {
          body.fields = params.fields;
        }
        if (params.expand?.length) {
          body.expand = params.expand;
        }

        const result = await client.post<JiraSearchResult>(
          `${API_PATHS.CORE}/search`,
          body,
        );

        const pagination = buildPaginationMeta(result.startAt, result.maxResults, result.total);
        return formatToolResponse(result, params.response_format, () =>
          formatIssueList(result.issues, pagination),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 6. jira_get_transitions ───────────────────────────────────────────
  server.registerTool(
    'jira_get_transitions',
    {
      title: 'Get Transitions',
      description: `Get available workflow transitions for a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of available transitions with IDs and target statuses.

Examples:
  - Get transitions: { issueIdOrKey: "PROJ-123" }

Error handling:
  - 404: Issue not found.
  - 403: No permission to view transitions for this issue.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
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

        const result = await client.get<{ transitions: JiraTransition[] }>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/transitions`,
        );

        return formatToolResponse(result, params.response_format, () =>
          formatTransitionList(result.transitions),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 7. jira_transition_issue ──────────────────────────────────────────
  server.registerTool(
    'jira_transition_issue',
    {
      title: 'Transition Issue',
      description: `Transition a Jira issue to a new status via a workflow transition.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - transitionId (string, required): Transition ID (from jira_get_transitions)
  - comment (string, optional): Comment to add with the transition
  - fields (object, optional): Fields required by the transition screen

Returns: Confirmation that the transition was applied.

Examples:
  - Simple transition: { issueIdOrKey: "PROJ-123", transitionId: "31" }
  - With comment: { issueIdOrKey: "PROJ-123", transitionId: "31", comment: "Moving to review" }

Error handling:
  - 400: Invalid transition or missing required fields.
  - 404: Issue not found.
  - 409: Transition not available from current status.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        transitionId: z.string().min(1).describe('Transition ID (from jira_get_transitions).'),
        comment: z.string().optional().describe('Comment to add with the transition.'),
        fields: z.record(z.string(), z.unknown()).optional().describe('Fields required by the transition screen.'),
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getJiraClient();
        const body: Record<string, unknown> = {
          transition: { id: params.transitionId },
        };
        if (params.comment) {
          body.update = {
            comment: [{ add: { body: params.comment } }],
          };
        }
        if (params.fields && Object.keys(params.fields).length > 0) {
          body.fields = params.fields;
        }

        await client.post<void>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/transitions`,
          body,
        );

        return {
          content: [{ type: 'text' as const, text: `Issue ${params.issueIdOrKey} transitioned successfully (transition ID: ${params.transitionId}).` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 8. jira_add_comment ───────────────────────────────────────────────
  server.registerTool(
    'jira_add_comment',
    {
      title: 'Add Comment',
      description: `Add a comment to a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - body (string, required): Comment body text
  - visibility (object, optional): Restrict comment visibility ({ type: "group"|"role", value: "name" })

Returns: Created comment details.

Examples:
  - Simple comment: { issueIdOrKey: "PROJ-123", body: "This is a comment" }
  - Restricted comment: { issueIdOrKey: "PROJ-123", body: "Internal note", visibility: { type: "role", value: "Developers" } }

Error handling:
  - 404: Issue not found.
  - 403: No permission to add comments.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        body: z.string().min(1).describe('Comment body text.'),
        visibility: VisibilitySchema,
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
        const requestBody: Record<string, unknown> = {
          body: params.body,
        };
        if (params.visibility) {
          requestBody.visibility = params.visibility;
        }

        const comment = await client.post<JiraComment>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/comment`,
          requestBody,
        );

        return {
          content: [{ type: 'text' as const, text: `Comment added to ${params.issueIdOrKey}.\n\n${formatComment(comment)}` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 9. jira_get_comments ──────────────────────────────────────────────
  server.registerTool(
    'jira_get_comments',
    {
      title: 'Get Comments',
      description: `Get comments on a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - startAt (number, optional): Pagination start index (default: 0)
  - maxResults (number, optional): Max results per page (default: 20)
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of comments with authors and timestamps.

Examples:
  - Get comments: { issueIdOrKey: "PROJ-123" }
  - Paginated: { issueIdOrKey: "PROJ-123", startAt: 20, maxResults: 10 }

Error handling:
  - 404: Issue not found.
  - 403: No permission to view comments.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        startAt: PaginationSchema.startAt,
        maxResults: z.number().int().min(1).max(100).default(DEFAULTS.COMMENT_MAX_RESULTS)
          .describe('Maximum number of comments to return per page (1-100, default 20).'),
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

        const result = await client.get<{
          comments: JiraComment[];
          total: number;
          startAt: number;
          maxResults: number;
        }>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/comment`,
          { startAt: params.startAt, maxResults: params.maxResults },
        );

        const pagination = buildPaginationMeta(result.startAt, result.maxResults, result.total);
        return formatToolResponse(result, params.response_format, () =>
          formatCommentList(result.comments, pagination),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 10. jira_update_comment ───────────────────────────────────────────
  server.registerTool(
    'jira_update_comment',
    {
      title: 'Update Comment',
      description: `Update an existing comment on a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - commentId (string, required): Comment ID to update
  - body (string, required): New comment body text
  - visibility (object, optional): Restrict comment visibility ({ type: "group"|"role", value: "name" })

Returns: Updated comment details.

Examples:
  - Update comment: { issueIdOrKey: "PROJ-123", commentId: "10100", body: "Updated text" }

Error handling:
  - 404: Issue or comment not found.
  - 403: No permission to update this comment.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        commentId: z.string().min(1).describe('Comment ID to update.'),
        body: z.string().min(1).describe('New comment body text.'),
        visibility: VisibilitySchema,
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getJiraClient();
        const requestBody: Record<string, unknown> = {
          body: params.body,
        };
        if (params.visibility) {
          requestBody.visibility = params.visibility;
        }

        const comment = await client.put<JiraComment>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/comment/${params.commentId}`,
          requestBody,
        );

        return {
          content: [{ type: 'text' as const, text: `Comment ${params.commentId} updated on ${params.issueIdOrKey}.\n\n${formatComment(comment)}` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 11. jira_delete_comment ───────────────────────────────────────────
  server.registerTool(
    'jira_delete_comment',
    {
      title: 'Delete Comment',
      description: `Delete a comment from a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - commentId (string, required): Comment ID to delete

Returns: Confirmation that the comment was deleted.

Examples:
  - Delete comment: { issueIdOrKey: "PROJ-123", commentId: "10100" }

Error handling:
  - 404: Issue or comment not found.
  - 403: No permission to delete this comment.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        commentId: z.string().min(1).describe('Comment ID to delete.'),
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

        await client.delete<void>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/comment/${params.commentId}`,
        );

        return {
          content: [{ type: 'text' as const, text: `Comment ${params.commentId} deleted from ${params.issueIdOrKey}.` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 12. jira_add_worklog ──────────────────────────────────────────────
  server.registerTool(
    'jira_add_worklog',
    {
      title: 'Add Worklog',
      description: `Log time spent on a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - timeSpent (string, required): Time spent in Jira duration format (e.g., "2h 30m", "1d", "45m")
  - started (string, optional): When the work started in ISO 8601 format (e.g., "2024-01-15T09:00:00.000+0000")
  - comment (string, optional): Worklog comment

Returns: Created worklog entry details.

Examples:
  - Simple worklog: { issueIdOrKey: "PROJ-123", timeSpent: "2h 30m" }
  - With details: { issueIdOrKey: "PROJ-123", timeSpent: "1d", started: "2024-01-15T09:00:00.000+0000", comment: "Implemented feature" }

Error handling:
  - 404: Issue not found.
  - 403: No permission to log work on this issue.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        timeSpent: z.string().min(1).describe('Time spent in Jira duration format (e.g., "2h 30m", "1d").'),
        started: z.string().optional().describe('When the work started in ISO 8601 format.'),
        comment: z.string().optional().describe('Worklog comment.'),
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
        const requestBody: Record<string, unknown> = {
          timeSpent: params.timeSpent,
        };
        if (params.started !== undefined) {
          requestBody.started = params.started;
        }
        if (params.comment !== undefined) {
          requestBody.comment = params.comment;
        }

        const worklog = await client.post<JiraWorklog>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/worklog`,
          requestBody,
        );

        const author = worklog.author?.displayName ?? worklog.author?.name ?? 'Unknown';
        return {
          content: [{ type: 'text' as const, text: `Worklog added to ${params.issueIdOrKey}: ${worklog.timeSpent} by ${author} (ID: ${worklog.id})` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 13. jira_get_worklogs ─────────────────────────────────────────────
  server.registerTool(
    'jira_get_worklogs',
    {
      title: 'Get Worklogs',
      description: `Get worklog entries for a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - startAt (number, optional): Pagination start index (default: 0)
  - maxResults (number, optional): Max results per page (default: 50)
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of worklog entries with authors, time spent, and dates.

Examples:
  - Get worklogs: { issueIdOrKey: "PROJ-123" }
  - Paginated: { issueIdOrKey: "PROJ-123", startAt: 0, maxResults: 10 }

Error handling:
  - 404: Issue not found.
  - 403: No permission to view worklogs.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        startAt: PaginationSchema.startAt,
        maxResults: PaginationSchema.maxResults,
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

        const result = await client.get<{
          worklogs: JiraWorklog[];
          total: number;
          startAt: number;
          maxResults: number;
        }>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/worklog`,
          { startAt: params.startAt, maxResults: params.maxResults },
        );

        const pagination = buildPaginationMeta(result.startAt, result.maxResults, result.total);
        return formatToolResponse(result, params.response_format, () =>
          formatWorklogList(result.worklogs, pagination),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 14. jira_add_watcher ──────────────────────────────────────────────
  server.registerTool(
    'jira_add_watcher',
    {
      title: 'Add Watcher',
      description: `Add a user as a watcher to a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - username (string, required): Username of the watcher to add

Returns: Confirmation that the watcher was added.

Examples:
  - Add watcher: { issueIdOrKey: "PROJ-123", username: "jsmith" }

Error handling:
  - 404: Issue not found or user does not exist.
  - 403: No permission to manage watchers.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        username: z.string().min(1).describe('Username of the watcher to add.'),
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getJiraClient();

        await client.post<void>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/watchers`,
          JSON.stringify(params.username),
        );

        return {
          content: [{ type: 'text' as const, text: `User "${params.username}" added as watcher to ${params.issueIdOrKey}.` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 15. jira_get_watchers ─────────────────────────────────────────────
  server.registerTool(
    'jira_get_watchers',
    {
      title: 'Get Watchers',
      description: `Get the list of watchers for a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of watchers and total watch count.

Examples:
  - Get watchers: { issueIdOrKey: "PROJ-123" }

Error handling:
  - 404: Issue not found.
  - 403: No permission to view watchers.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
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

        const result = await client.get<{ watchCount: number; watchers: JiraUser[] }>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/watchers`,
        );

        return formatToolResponse(result, params.response_format, () =>
          formatWatcherList(result.watchers, result.watchCount),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 16. jira_add_remote_link ──────────────────────────────────────────
  server.registerTool(
    'jira_add_remote_link',
    {
      title: 'Add Remote Link',
      description: `Add a remote link (external URL) to a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - url (string, required): URL of the remote link
  - title (string, required): Display title for the link
  - summary (string, optional): Short summary of the linked resource
  - relationship (string, optional): Relationship type (e.g., "relates to", "is caused by")

Returns: Created remote link details.

Examples:
  - Add link: { issueIdOrKey: "PROJ-123", url: "https://example.com/doc", title: "Design Doc" }
  - With relationship: { issueIdOrKey: "PROJ-123", url: "https://github.com/pr/1", title: "PR #1", relationship: "is fixed by" }

Error handling:
  - 404: Issue not found.
  - 403: No permission to add remote links.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
        url: z.string().url().describe('URL of the remote link.'),
        title: z.string().min(1).describe('Display title for the link.'),
        summary: z.string().optional().describe('Short summary of the linked resource.'),
        relationship: z.string().optional().describe('Relationship type (e.g., "relates to").'),
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
        const linkObject: Record<string, unknown> = {
          url: params.url,
          title: params.title,
        };
        if (params.summary !== undefined) {
          linkObject.summary = params.summary;
        }

        const requestBody: Record<string, unknown> = {
          object: linkObject,
        };
        if (params.relationship !== undefined) {
          requestBody.relationship = params.relationship;
        }

        const result = await client.post<{ id: number; self: string }>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/remotelink`,
          requestBody,
        );

        return {
          content: [{ type: 'text' as const, text: `Remote link added to ${params.issueIdOrKey}: "${params.title}" (${params.url}) — ID: ${result.id}` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 17. jira_get_remote_links ─────────────────────────────────────────
  server.registerTool(
    'jira_get_remote_links',
    {
      title: 'Get Remote Links',
      description: `Get all remote links for a Jira issue.

Args:
  - issueIdOrKey (string, required): Issue key (e.g., "PROJ-123") or numeric ID
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of remote links with URLs, titles, and relationships.

Examples:
  - Get remote links: { issueIdOrKey: "PROJ-123" }

Error handling:
  - 404: Issue not found.
  - 403: No permission to view remote links.`,
      inputSchema: z.object({
        issueIdOrKey: IssueIdOrKeySchema,
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

        const links = await client.get<JiraRemoteLink[]>(
          `${API_PATHS.CORE}/issue/${params.issueIdOrKey}/remotelink`,
        );

        return formatToolResponse(links, params.response_format, () =>
          formatRemoteLinkList(links),
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );

  // ── 18. jira_rank_issues ──────────────────────────────────────────────
  server.registerTool(
    'jira_rank_issues',
    {
      title: 'Rank Issues',
      description: `Rank (reorder) issues on an agile board by placing them before or after a reference issue.

Args:
  - issues (string[], required): Issue keys or IDs to rank (e.g., ["PROJ-1", "PROJ-2"])
  - rankBeforeIssue (string, optional): Place the issues before this issue key/ID
  - rankAfterIssue (string, optional): Place the issues after this issue key/ID

Returns: Confirmation that the issues were ranked.

Examples:
  - Rank before: { issues: ["PROJ-5"], rankBeforeIssue: "PROJ-3" }
  - Rank after: { issues: ["PROJ-5", "PROJ-6"], rankAfterIssue: "PROJ-10" }

Error handling:
  - 400: Invalid issue keys or neither rankBeforeIssue nor rankAfterIssue specified.
  - 403: No permission to rank issues.
  - 404: One or more issues not found.`,
      inputSchema: z.object({
        issues: z.array(z.string().min(1)).min(1).describe('Issue keys or IDs to rank.'),
        rankBeforeIssue: z.string().optional().describe('Place the issues before this issue key/ID.'),
        rankAfterIssue: z.string().optional().describe('Place the issues after this issue key/ID.'),
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getJiraClient();
        const requestBody: Record<string, unknown> = {
          issues: params.issues,
        };
        if (params.rankBeforeIssue !== undefined) {
          requestBody.rankBeforeIssue = params.rankBeforeIssue;
        }
        if (params.rankAfterIssue !== undefined) {
          requestBody.rankAfterIssue = params.rankAfterIssue;
        }

        await client.put<void>(
          `${API_PATHS.AGILE}/issue/rank`,
          requestBody,
        );

        return {
          content: [{ type: 'text' as const, text: `Issues ranked successfully: ${params.issues.join(', ')}` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );
}
