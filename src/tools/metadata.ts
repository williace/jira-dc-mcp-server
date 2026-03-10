/**
 * Jira instance metadata tools (10 tools). Query system-level configuration:
 * fields (system + custom), priorities, statuses, issue types, resolutions,
 * saved JQL filters, and dashboards. Useful for discovering valid field names
 * and values before creating/updating issues.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getJiraClient } from '../services/jira-client.js';
import { formatToolResponse, formatFieldList, formatSimpleList, formatFilter, formatFilterList, formatDashboardList } from '../services/formatters.js';
import { buildErrorResult } from '../utils/errors.js';
import { ResponseFormatSchema } from '../schemas/common.js';
import { API_PATHS } from '../constants.js';
import type { JiraField, JiraPriority, JiraStatus, JiraIssueType, JiraResolution, JiraFilter, JiraDashboard, JiraIssueLinkType } from '../types.js';

/** Registers all metadata-related tools on the MCP server. */
export function registerMetadataTools(server: McpServer): void {

  // 1. jira_list_fields
  server.registerTool(
    'jira_list_fields',
    {
      title: 'List Jira Fields',
      description: `List all fields (system and custom) available in the Jira instance.

Args:
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of fields with ID, name, type, and whether they are custom or system fields.

Examples:
  - List all fields: {}
  - Use to find custom field IDs for jira_create_issue or jira_update_issue.

Error handling:
  - 403: No permission to view fields.`,
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
        const fields = await client.get<JiraField[]>(`${API_PATHS.CORE}/field`);
        return formatToolResponse(fields, params.response_format, () => formatFieldList(fields));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 2. jira_create_custom_field
  server.registerTool(
    'jira_create_custom_field',
    {
      title: 'Create Custom Field',
      description: `Create a new custom field in Jira.

Args:
  - name (string, required): Display name for the custom field
  - type (string, required): Custom field type (e.g., "com.atlassian.jira.plugin.system.customfieldtypes:textfield")
  - description (string, optional): Description of the custom field
  - searcherKey (string, optional): Searcher key for the field

Returns: Created custom field details.

Examples:
  - Create text field: { name: "Release Notes", type: "com.atlassian.jira.plugin.system.customfieldtypes:textfield" }

Error handling:
  - 400: Invalid field type or name already exists.
  - 403: No permission to create custom fields (requires admin).`,
      inputSchema: z.object({
        name: z.string().min(1).describe('Display name for the custom field.'),
        type: z.string().min(1).describe('Custom field type identifier.'),
        description: z.string().optional().describe('Description of the field.'),
        searcherKey: z.string().optional().describe('Searcher key for the field.'),
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
        const body: Record<string, unknown> = {
          name: params.name,
          type: params.type,
        };
        if (params.description) body.description = params.description;
        if (params.searcherKey) body.searcherKey = params.searcherKey;

        const result = await client.post<JiraField>(`${API_PATHS.CORE}/field`, body);
        return {
          content: [{ type: 'text' as const, text: `Custom field created: ${result.name} (${result.id})` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 3. jira_list_priorities
  server.registerTool(
    'jira_list_priorities',
    {
      title: 'List Jira Priorities',
      description: `List all priority levels available in the Jira instance.

Args:
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of priorities with ID, name, and description.

Examples:
  - List priorities: {}

Error handling:
  - 403: No permission to view priorities.`,
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
        const priorities = await client.get<JiraPriority[]>(`${API_PATHS.CORE}/priority`);
        return formatToolResponse(priorities, params.response_format, () => formatSimpleList('Priorities', priorities));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 4. jira_list_statuses
  server.registerTool(
    'jira_list_statuses',
    {
      title: 'List Jira Statuses',
      description: `List all statuses available in the Jira instance.

Args:
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of statuses with ID, name, description, and status category.

Examples:
  - List statuses: {}`,
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
        const statuses = await client.get<JiraStatus[]>(`${API_PATHS.CORE}/status`);
        return formatToolResponse(statuses, params.response_format, () => formatSimpleList('Statuses', statuses));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 5. jira_list_issue_types
  server.registerTool(
    'jira_list_issue_types',
    {
      title: 'List Issue Types',
      description: `List all issue types available in the Jira instance.

Args:
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of issue types with ID, name, description, and whether they are subtask types.

Examples:
  - List issue types: {}
  - Use to find valid issue type names for jira_create_issue.`,
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
        const types = await client.get<JiraIssueType[]>(`${API_PATHS.CORE}/issuetype`);
        return formatToolResponse(types, params.response_format, () => formatSimpleList('Issue Types', types));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 6. jira_list_resolutions
  server.registerTool(
    'jira_list_resolutions',
    {
      title: 'List Resolutions',
      description: `List all resolution types available in the Jira instance.

Args:
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of resolutions with ID, name, and description.

Examples:
  - List resolutions: {}`,
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
        const resolutions = await client.get<JiraResolution[]>(`${API_PATHS.CORE}/resolution`);
        return formatToolResponse(resolutions, params.response_format, () => formatSimpleList('Resolutions', resolutions));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 7. jira_create_filter
  server.registerTool(
    'jira_create_filter',
    {
      title: 'Create JQL Filter',
      description: `Create a saved JQL filter.

Args:
  - name (string, required): Filter name
  - jql (string, required): JQL query string
  - description (string, optional): Filter description
  - favourite (boolean, optional): Whether to add to favourites (default false)

Returns: Created filter with ID, name, JQL, and view URL.

Examples:
  - Create filter: { name: "My Open Bugs", jql: "project = PROJ AND type = Bug AND status != Done" }

Error handling:
  - 400: Invalid JQL query.`,
      inputSchema: z.object({
        name: z.string().min(1).describe('Filter name.'),
        jql: z.string().min(1).describe('JQL query string.'),
        description: z.string().optional().describe('Filter description.'),
        favourite: z.boolean().default(false).describe('Whether to add to favourites.'),
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
        const body: Record<string, unknown> = {
          name: params.name,
          jql: params.jql,
          favourite: params.favourite,
        };
        if (params.description) body.description = params.description;

        const result = await client.post<JiraFilter>(`${API_PATHS.CORE}/filter`, body);
        return {
          content: [{ type: 'text' as const, text: `Filter created: ${result.name} (ID: ${result.id})\nJQL: ${result.jql}\nView: ${result.viewUrl ?? ''}` }],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 8. jira_get_filter
  server.registerTool(
    'jira_get_filter',
    {
      title: 'Get JQL Filter',
      description: `Get a saved filter by ID.

Args:
  - filterId (string, required): Filter ID
  - response_format (string, optional): "markdown" (default) or "json"

Returns: Filter details including name, JQL query, owner, and view URL.

Examples:
  - Get filter: { filterId: "12345" }

Error handling:
  - 404: Filter not found.
  - 403: No permission to view this filter.`,
      inputSchema: z.object({
        filterId: z.string().min(1).describe('Filter ID.'),
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
        const filter = await client.get<JiraFilter>(
          `${API_PATHS.CORE}/filter/${encodeURIComponent(params.filterId)}`
        );
        return formatToolResponse(filter, params.response_format, () => formatFilter(filter));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 9. jira_get_favourite_filters
  server.registerTool(
    'jira_get_favourite_filters',
    {
      title: 'Get Favourite Filters',
      description: `List the current user's favourite (starred) filters.

Args:
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of favourite filters with name, JQL, and owner.

Examples:
  - Get favourites: {}`,
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
        const filters = await client.get<JiraFilter[]>(`${API_PATHS.CORE}/filter/favourite`);
        return formatToolResponse(filters, params.response_format, () => formatFilterList(filters));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 10. jira_list_dashboards
  server.registerTool(
    'jira_list_dashboards',
    {
      title: 'List Dashboards',
      description: `List dashboards accessible to the current user.

Args:
  - filter (string, optional): Filter by "favourite" or "my" dashboards
  - startAt (number, optional): Index of the first result (0-based, default 0)
  - maxResults (number, optional): Maximum results to return (1-100, default 50)
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of dashboards with ID and name.

Examples:
  - List all dashboards: {}
  - List favourites: { filter: "favourite" }`,
      inputSchema: z.object({
        filter: z.enum(['favourite', 'my']).optional()
          .describe('Filter dashboards: "favourite" or "my".'),
        startAt: z.number().int().min(0).default(0)
          .describe('Index of the first result (0-based, default 0).'),
        maxResults: z.number().int().min(1).max(100).default(50)
          .describe('Maximum results to return (1-100, default 50).'),
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
        const queryParams: Record<string, unknown> = {
          startAt: params.startAt,
          maxResults: params.maxResults,
        };
        if (params.filter) queryParams.filter = params.filter;

        const result = await client.get<{ dashboards: JiraDashboard[] }>(
          `${API_PATHS.CORE}/dashboard`,
          queryParams
        );
        const dashboards = result.dashboards ?? [];
        return formatToolResponse(dashboards, params.response_format, () => formatDashboardList(dashboards));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // 11. jira_get_issue_link_types
  server.registerTool(
    'jira_get_issue_link_types',
    {
      title: 'Get Issue Link Types',
      description: `List all issue link types available in the Jira instance.

Args:
  - response_format (string, optional): "markdown" (default) or "json"

Returns: List of link types with ID, name, and inward/outward direction labels.

Examples:
  - List link types: {}
  - Use with jira_link_issues to find valid linkTypeName values and understand their directionality.

Error handling:
  - 403: No permission to view link types.`,
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
        const result = await client.get<{ issueLinkTypes: JiraIssueLinkType[] }>(
          `${API_PATHS.CORE}/issueLinkType`,
        );
        const types = result.issueLinkTypes ?? [];
        return formatToolResponse(types, params.response_format, () => {
          const lines = [`# Issue Link Types (${types.length})\n`];
          for (const t of types) {
            lines.push(`- **${t.name}** (ID: ${t.id}) — inward: "${t.inward ?? ''}", outward: "${t.outward ?? ''}"`);
          }
          return lines.join('\n');
        });
      } catch (error) {
        return buildErrorResult(error);
      }
    },
  );
}
