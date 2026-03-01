import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getJiraClient } from '../services/jira-client.js';
import {
  formatToolResponse,
  formatProject,
  formatProjectList,
  formatComponentList,
  formatComponent,
  formatVersionList,
  formatVersion,
  formatSimpleList,
} from '../services/formatters.js';
import { buildErrorResult } from '../utils/errors.js';
import { ResponseFormatSchema, ProjectIdOrKeySchema } from '../schemas/common.js';
import { API_PATHS } from '../constants.js';
import type { JiraProject, JiraComponent, JiraVersion, JiraStatus, JiraIssueType } from '../types.js';

interface IssueTypeWithStatuses {
  id: string;
  name: string;
  self: string;
  subtask: boolean;
  statuses: JiraStatus[];
}

export function registerProjectTools(server: McpServer): void {
  // ──────────────────────────────────────────────
  // 1. jira_list_projects
  // ──────────────────────────────────────────────
  server.tool(
    'jira_list_projects',
    `List all accessible Jira projects.

Args:
  response_format: Response format ("markdown" or "json", default "markdown").

Returns:
  List of projects with key, name, and lead information.

Examples:
  - List all projects: {}
  - Get JSON output: { response_format: "json" }

Error handling:
  Returns error if the request fails or authentication is invalid.`,
    {
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ response_format }) => {
      try {
        const client = getJiraClient();
        const projects = await client.get<JiraProject[]>(`${API_PATHS.CORE}/project`);
        return formatToolResponse(projects, response_format, () => formatProjectList(projects));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 2. jira_get_project
  // ──────────────────────────────────────────────
  server.tool(
    'jira_get_project',
    `Get detailed information about a specific Jira project.

Args:
  projectIdOrKey: Project ID (numeric) or project key (e.g., "PROJ").
  response_format: Response format ("markdown" or "json", default "markdown").

Returns:
  Project details including name, key, lead, description, category, and type.

Examples:
  - By key: { projectIdOrKey: "PROJ" }
  - By ID: { projectIdOrKey: "10001" }

Error handling:
  Returns error if the project does not exist or is not accessible.`,
    {
      projectIdOrKey: ProjectIdOrKeySchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ projectIdOrKey, response_format }) => {
      try {
        const client = getJiraClient();
        const project = await client.get<JiraProject>(
          `${API_PATHS.CORE}/project/${encodeURIComponent(projectIdOrKey)}`
        );
        return formatToolResponse(project, response_format, () => formatProject(project));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 3. jira_get_project_versions
  // ──────────────────────────────────────────────
  server.tool(
    'jira_get_project_versions',
    `List all versions (releases) for a Jira project.

Args:
  projectIdOrKey: Project ID (numeric) or project key (e.g., "PROJ").
  response_format: Response format ("markdown" or "json", default "markdown").

Returns:
  List of versions with name, status (released/archived/unreleased), and dates.

Examples:
  - List versions: { projectIdOrKey: "PROJ" }

Error handling:
  Returns error if the project does not exist or is not accessible.`,
    {
      projectIdOrKey: ProjectIdOrKeySchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ projectIdOrKey, response_format }) => {
      try {
        const client = getJiraClient();
        const versions = await client.get<JiraVersion[]>(
          `${API_PATHS.CORE}/project/${encodeURIComponent(projectIdOrKey)}/versions`
        );
        return formatToolResponse(versions, response_format, () => formatVersionList(versions));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 4. jira_get_project_components
  // ──────────────────────────────────────────────
  server.tool(
    'jira_get_project_components',
    `List all components for a Jira project.

Args:
  projectIdOrKey: Project ID (numeric) or project key (e.g., "PROJ").
  response_format: Response format ("markdown" or "json", default "markdown").

Returns:
  List of components with name, ID, description, and lead.

Examples:
  - List components: { projectIdOrKey: "PROJ" }

Error handling:
  Returns error if the project does not exist or is not accessible.`,
    {
      projectIdOrKey: ProjectIdOrKeySchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ projectIdOrKey, response_format }) => {
      try {
        const client = getJiraClient();
        const components = await client.get<JiraComponent[]>(
          `${API_PATHS.CORE}/project/${encodeURIComponent(projectIdOrKey)}/components`
        );
        return formatToolResponse(components, response_format, () =>
          formatComponentList(components)
        );
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 5. jira_get_project_statuses
  // ──────────────────────────────────────────────
  server.tool(
    'jira_get_project_statuses',
    `List all statuses available in a Jira project, grouped by issue type.

Args:
  projectIdOrKey: Project ID (numeric) or project key (e.g., "PROJ").
  response_format: Response format ("markdown" or "json", default "markdown").

Returns:
  Issue types with their available statuses, including status names and categories.

Examples:
  - Get statuses: { projectIdOrKey: "PROJ" }

Error handling:
  Returns error if the project does not exist or is not accessible.`,
    {
      projectIdOrKey: ProjectIdOrKeySchema,
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ projectIdOrKey, response_format }) => {
      try {
        const client = getJiraClient();
        const issueTypes = await client.get<IssueTypeWithStatuses[]>(
          `${API_PATHS.CORE}/project/${encodeURIComponent(projectIdOrKey)}/statuses`
        );
        return formatToolResponse(issueTypes, response_format, () => {
          const lines: string[] = [`# Project Statuses\n`];
          for (const issueType of issueTypes) {
            lines.push(`## ${issueType.name}${issueType.subtask ? ' (Subtask)' : ''}`);
            if (issueType.statuses.length === 0) {
              lines.push('- _No statuses_');
            } else {
              for (const status of issueType.statuses) {
                const category = status.statusCategory?.name
                  ? ` [${status.statusCategory.name}]`
                  : '';
                lines.push(`- **${status.name}** (ID: ${status.id})${category}`);
              }
            }
            lines.push('');
          }
          return lines.join('\n');
        });
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 6. jira_create_component
  // ──────────────────────────────────────────────
  server.tool(
    'jira_create_component',
    `Create a new component in a Jira project.

Args:
  projectKey: The project key (e.g., "PROJ") where the component will be created.
  name: Name of the new component.
  description: (Optional) Description of the component.
  leadUserName: (Optional) Username of the component lead.
  assigneeType: (Optional) Default assignee type: PROJECT_DEFAULT, COMPONENT_LEAD, PROJECT_LEAD, or UNASSIGNED.

Returns:
  The created component with its ID, name, description, and lead.

Examples:
  - Simple: { projectKey: "PROJ", name: "Backend" }
  - Full: { projectKey: "PROJ", name: "Backend", description: "Backend services", leadUserName: "jdoe", assigneeType: "COMPONENT_LEAD" }

Error handling:
  Returns error if the project does not exist, name is duplicate, or permissions are insufficient.`,
    {
      projectKey: z.string().min(1).describe('Project key (e.g., "PROJ").'),
      name: z.string().min(1).describe('Name of the component.'),
      description: z.string().optional().describe('Description of the component.'),
      leadUserName: z.string().optional().describe('Username of the component lead.'),
      assigneeType: z
        .enum(['PROJECT_DEFAULT', 'COMPONENT_LEAD', 'PROJECT_LEAD', 'UNASSIGNED'])
        .optional()
        .describe('Default assignee type for issues in this component.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ projectKey, name, description, leadUserName, assigneeType }) => {
      try {
        const client = getJiraClient();
        const body: Record<string, unknown> = {
          project: projectKey,
          name,
        };
        if (description !== undefined) body.description = description;
        if (leadUserName !== undefined) body.leadUserName = leadUserName;
        if (assigneeType !== undefined) body.assigneeType = assigneeType;

        const component = await client.post<JiraComponent>(
          `${API_PATHS.CORE}/component`,
          body
        );
        return formatToolResponse(component, 'markdown', () => formatComponent(component));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 7. jira_get_component
  // ──────────────────────────────────────────────
  server.tool(
    'jira_get_component',
    `Get detailed information about a specific component.

Args:
  componentId: The component ID (numeric string).
  response_format: Response format ("markdown" or "json", default "markdown").

Returns:
  Component details including name, description, lead, and assignee type.

Examples:
  - Get component: { componentId: "10100" }

Error handling:
  Returns error if the component does not exist or is not accessible.`,
    {
      componentId: z.string().min(1).describe('Component ID (numeric string).'),
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ componentId, response_format }) => {
      try {
        const client = getJiraClient();
        const component = await client.get<JiraComponent>(
          `${API_PATHS.CORE}/component/${encodeURIComponent(componentId)}`
        );
        return formatToolResponse(component, response_format, () => formatComponent(component));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 8. jira_update_component
  // ──────────────────────────────────────────────
  server.tool(
    'jira_update_component',
    `Update an existing component. Only provided fields are changed.

Args:
  componentId: The component ID (numeric string).
  name: (Optional) New name for the component.
  description: (Optional) New description.
  leadUserName: (Optional) New component lead username.
  assigneeType: (Optional) New default assignee type: PROJECT_DEFAULT, COMPONENT_LEAD, PROJECT_LEAD, or UNASSIGNED.

Returns:
  The updated component with its current details.

Examples:
  - Rename: { componentId: "10100", name: "New Name" }
  - Change lead: { componentId: "10100", leadUserName: "jsmith" }

Error handling:
  Returns error if the component does not exist, name conflicts, or permissions are insufficient.`,
    {
      componentId: z.string().min(1).describe('Component ID (numeric string).'),
      name: z.string().optional().describe('New name for the component.'),
      description: z.string().optional().describe('New description for the component.'),
      leadUserName: z.string().optional().describe('New component lead username.'),
      assigneeType: z
        .enum(['PROJECT_DEFAULT', 'COMPONENT_LEAD', 'PROJECT_LEAD', 'UNASSIGNED'])
        .optional()
        .describe('New default assignee type.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ componentId, name, description, leadUserName, assigneeType }) => {
      try {
        const client = getJiraClient();
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (description !== undefined) body.description = description;
        if (leadUserName !== undefined) body.leadUserName = leadUserName;
        if (assigneeType !== undefined) body.assigneeType = assigneeType;

        const component = await client.put<JiraComponent>(
          `${API_PATHS.CORE}/component/${encodeURIComponent(componentId)}`,
          body
        );
        return formatToolResponse(component, 'markdown', () => formatComponent(component));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 9. jira_delete_component
  // ──────────────────────────────────────────────
  server.tool(
    'jira_delete_component',
    `Delete a component from a Jira project.

Args:
  componentId: The component ID (numeric string) to delete.
  moveIssuesTo: (Optional) Component ID to reassign issues to before deletion.

Returns:
  Confirmation that the component was deleted.

Examples:
  - Delete: { componentId: "10100" }
  - Delete and move issues: { componentId: "10100", moveIssuesTo: "10101" }

Error handling:
  Returns error if the component does not exist or permissions are insufficient.`,
    {
      componentId: z.string().min(1).describe('Component ID to delete.'),
      moveIssuesTo: z
        .string()
        .optional()
        .describe('Component ID to reassign issues to before deletion.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ componentId, moveIssuesTo }) => {
      try {
        const client = getJiraClient();
        let path = `${API_PATHS.CORE}/component/${encodeURIComponent(componentId)}`;
        if (moveIssuesTo !== undefined) {
          path += `?moveIssuesTo=${encodeURIComponent(moveIssuesTo)}`;
        }
        await client.delete(path);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Component ${componentId} deleted successfully.${moveIssuesTo ? ` Issues moved to component ${moveIssuesTo}.` : ''}`,
            },
          ],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 10. jira_create_version
  // ──────────────────────────────────────────────
  server.tool(
    'jira_create_version',
    `Create a new version (release) in a Jira project.

Args:
  projectKey: The project key (e.g., "PROJ") where the version will be created.
  name: Name of the version (e.g., "1.0.0").
  description: (Optional) Description of the version.
  releaseDate: (Optional) Release date in YYYY-MM-DD format.
  startDate: (Optional) Start date in YYYY-MM-DD format.
  released: (Optional) Whether the version is released (default false).
  archived: (Optional) Whether the version is archived (default false).

Returns:
  The created version with its ID, name, dates, and status.

Examples:
  - Simple: { projectKey: "PROJ", name: "1.0.0" }
  - Full: { projectKey: "PROJ", name: "2.0.0", description: "Major release", releaseDate: "2025-06-01", released: false }

Error handling:
  Returns error if the project does not exist, name is duplicate, or permissions are insufficient.`,
    {
      projectKey: z.string().min(1).describe('Project key (e.g., "PROJ").'),
      name: z.string().min(1).describe('Name of the version (e.g., "1.0.0").'),
      description: z.string().optional().describe('Description of the version.'),
      releaseDate: z
        .string()
        .optional()
        .describe('Release date in YYYY-MM-DD format.'),
      startDate: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format.'),
      released: z.boolean().optional().describe('Whether the version is released.'),
      archived: z.boolean().optional().describe('Whether the version is archived.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ projectKey, name, description, releaseDate, startDate, released, archived }) => {
      try {
        const client = getJiraClient();
        const body: Record<string, unknown> = {
          project: projectKey,
          name,
        };
        if (description !== undefined) body.description = description;
        if (releaseDate !== undefined) body.releaseDate = releaseDate;
        if (startDate !== undefined) body.startDate = startDate;
        if (released !== undefined) body.released = released;
        if (archived !== undefined) body.archived = archived;

        const version = await client.post<JiraVersion>(
          `${API_PATHS.CORE}/version`,
          body
        );
        return formatToolResponse(version, 'markdown', () => formatVersion(version));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 11. jira_get_version
  // ──────────────────────────────────────────────
  server.tool(
    'jira_get_version',
    `Get detailed information about a specific version.

Args:
  versionId: The version ID (numeric string).
  response_format: Response format ("markdown" or "json", default "markdown").

Returns:
  Version details including name, description, release/start dates, and released/archived status.

Examples:
  - Get version: { versionId: "10200" }

Error handling:
  Returns error if the version does not exist or is not accessible.`,
    {
      versionId: z.string().min(1).describe('Version ID (numeric string).'),
      response_format: ResponseFormatSchema,
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ versionId, response_format }) => {
      try {
        const client = getJiraClient();
        const version = await client.get<JiraVersion>(
          `${API_PATHS.CORE}/version/${encodeURIComponent(versionId)}`
        );
        return formatToolResponse(version, response_format, () => formatVersion(version));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 12. jira_update_version
  // ──────────────────────────────────────────────
  server.tool(
    'jira_update_version',
    `Update an existing version. Only provided fields are changed.

Args:
  versionId: The version ID (numeric string).
  name: (Optional) New name for the version.
  description: (Optional) New description.
  releaseDate: (Optional) New release date in YYYY-MM-DD format.
  startDate: (Optional) New start date in YYYY-MM-DD format.
  released: (Optional) Whether the version is released.
  archived: (Optional) Whether the version is archived.

Returns:
  The updated version with its current details.

Examples:
  - Rename: { versionId: "10200", name: "1.1.0" }
  - Mark released: { versionId: "10200", released: true, releaseDate: "2025-03-01" }

Error handling:
  Returns error if the version does not exist, name conflicts, or permissions are insufficient.`,
    {
      versionId: z.string().min(1).describe('Version ID (numeric string).'),
      name: z.string().optional().describe('New name for the version.'),
      description: z.string().optional().describe('New description for the version.'),
      releaseDate: z
        .string()
        .optional()
        .describe('New release date in YYYY-MM-DD format.'),
      startDate: z
        .string()
        .optional()
        .describe('New start date in YYYY-MM-DD format.'),
      released: z.boolean().optional().describe('Whether the version is released.'),
      archived: z.boolean().optional().describe('Whether the version is archived.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ versionId, name, description, releaseDate, startDate, released, archived }) => {
      try {
        const client = getJiraClient();
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (description !== undefined) body.description = description;
        if (releaseDate !== undefined) body.releaseDate = releaseDate;
        if (startDate !== undefined) body.startDate = startDate;
        if (released !== undefined) body.released = released;
        if (archived !== undefined) body.archived = archived;

        const version = await client.put<JiraVersion>(
          `${API_PATHS.CORE}/version/${encodeURIComponent(versionId)}`,
          body
        );
        return formatToolResponse(version, 'markdown', () => formatVersion(version));
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );

  // ──────────────────────────────────────────────
  // 13. jira_delete_version
  // ──────────────────────────────────────────────
  server.tool(
    'jira_delete_version',
    `Delete a version from a Jira project.

Args:
  versionId: The version ID (numeric string) to delete.
  moveFixIssuesTo: (Optional) Version ID to reassign fix-version issues to before deletion.
  moveAffectedIssuesTo: (Optional) Version ID to reassign affected-version issues to before deletion.

Returns:
  Confirmation that the version was deleted.

Examples:
  - Delete: { versionId: "10200" }
  - Delete and move: { versionId: "10200", moveFixIssuesTo: "10201", moveAffectedIssuesTo: "10201" }

Error handling:
  Returns error if the version does not exist or permissions are insufficient.`,
    {
      versionId: z.string().min(1).describe('Version ID to delete.'),
      moveFixIssuesTo: z
        .string()
        .optional()
        .describe('Version ID to reassign fix-version issues to before deletion.'),
      moveAffectedIssuesTo: z
        .string()
        .optional()
        .describe('Version ID to reassign affected-version issues to before deletion.'),
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ versionId, moveFixIssuesTo, moveAffectedIssuesTo }) => {
      try {
        const client = getJiraClient();
        const params = new URLSearchParams();
        if (moveFixIssuesTo !== undefined) {
          params.set('moveFixIssuesTo', moveFixIssuesTo);
        }
        if (moveAffectedIssuesTo !== undefined) {
          params.set('moveAffectedIssuesTo', moveAffectedIssuesTo);
        }
        const query = params.toString();
        const path = `${API_PATHS.CORE}/version/${encodeURIComponent(versionId)}${query ? `?${query}` : ''}`;
        await client.delete(path);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Version ${versionId} deleted successfully.${moveFixIssuesTo ? ` Fix-version issues moved to version ${moveFixIssuesTo}.` : ''}${moveAffectedIssuesTo ? ` Affected-version issues moved to version ${moveAffectedIssuesTo}.` : ''}`,
            },
          ],
        };
      } catch (error) {
        return buildErrorResult(error);
      }
    }
  );
}
