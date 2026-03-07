/**
 * User tools (3 tools). Look up users by username, search users by name/email,
 * and get the currently authenticated user (PAT owner). All operations use
 * Jira Core REST API v2.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getJiraClient } from '../services/jira-client.js';
import { formatToolResponse, formatUser, formatUserList } from '../services/formatters.js';
import { buildErrorResult } from '../utils/errors.js';
import { ResponseFormatSchema } from '../schemas/common.js';
import { API_PATHS } from '../constants.js';
import type { JiraUser } from '../types.js';

/** Registers all user-related tools on the MCP server. */
export function registerUserTools(server: McpServer): void {

  // 1. jira_get_user
  server.registerTool(
    'jira_get_user',
    {
      title: 'Get Jira User',
      description: `Get user details by username.

Args:
  - username (string, required): The username to look up
  - response_format (string, optional): "markdown" (default) or "json"

Returns: User details including display name, email, active status, and timezone.

Examples:
  - Get user: { username: "jsmith" }

Error handling:
  - 404: User not found. Verify the username is correct.`,
      inputSchema: z.object({
        username: z.string().min(1).describe('Username to look up.'),
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
        const user = await client.get<JiraUser>(
          `${API_PATHS.CORE}/user`,
          { username: params.username }
        );
        return formatToolResponse(user, params.response_format, () => formatUser(user));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 2. jira_search_users
  server.registerTool(
    'jira_search_users',
    {
      title: 'Search Jira Users',
      description: `Search for users by username, display name, or email.

Args:
  - query (string, required): Search query to match against usernames, display names, or emails
  - maxResults (number, optional): Maximum results to return (1-100, default 50)
  - startAt (number, optional): Index of the first result (0-based, default 0)
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of matching users.

Examples:
  - Search by name: { query: "john" }
  - Search by email domain: { query: "@company.com" }

Note: Jira 10+ limits user search to a maximum of 100 results. Use more specific
search queries to narrow results if needed.

Error handling:
  - 403: No permission to browse users.`,
      inputSchema: z.object({
        query: z.string().min(1).describe('Search query for username, display name, or email.'),
        maxResults: z.number().int().min(1).max(100).default(50)
          .describe('Maximum results to return (1-100, default 50).'),
        startAt: z.number().int().min(0).default(0)
          .describe('Index of the first result (0-based, default 0).'),
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
        const users = await client.get<JiraUser[]>(
          `${API_PATHS.CORE}/user/search`,
          {
            username: params.query,
            maxResults: params.maxResults,
            startAt: params.startAt,
          }
        );
        return formatToolResponse(users, params.response_format, () => formatUserList(users));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 3. jira_get_myself
  server.registerTool(
    'jira_get_myself',
    {
      title: 'Get Current User',
      description: `Get the currently authenticated user's details (the user associated with the PAT).

Args:
  - response_format (string, optional): "markdown" (default) or "json"

Returns: Current user details including display name, username, email, active status, and timezone.

Examples:
  - Get current user: {}

Error handling:
  - 401: Authentication failed. Verify JIRA_PAT is valid.`,
      inputSchema: z.object({
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
        const user = await client.get<JiraUser>(`${API_PATHS.CORE}/myself`);
        return formatToolResponse(user, params.response_format, () => formatUser(user));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );
}
