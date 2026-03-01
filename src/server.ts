/**
 * MCP server factory.
 *
 * Creates and configures the McpServer instance by registering tool groups.
 * Tool groups can be selectively enabled via the ENABLED_TOOL_GROUPS env var
 * (comma-separated list, e.g. "issues,projects,boards"). When unset, all
 * groups are registered.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TOOL_GROUPS, type ToolGroup } from './constants.js';
import { registerIssueTools } from './tools/issues.js';
import { registerProjectTools } from './tools/projects.js';
import { registerUserTools } from './tools/users.js';
import { registerBoardTools } from './tools/boards.js';
import { registerSprintTools } from './tools/sprints.js';
import { registerEpicTools } from './tools/epics.js';
import { registerMetadataTools } from './tools/metadata.js';
import { registerAttachmentTools } from './tools/attachments.js';

/** Maps each tool group name to the function that registers its tools on the server. */
const TOOL_REGISTRARS: Record<ToolGroup, (server: McpServer) => void> = {
  issues: registerIssueTools,
  projects: registerProjectTools,
  users: registerUserTools,
  boards: registerBoardTools,
  sprints: registerSprintTools,
  epics: registerEpicTools,
  metadata: registerMetadataTools,
  attachments: registerAttachmentTools,
};

/** Create a new McpServer with the enabled tool groups registered. */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'jira-dc-mcp-server',
    version: '1.0.0',
  });

  const enabledGroups = getEnabledToolGroups();

  for (const group of enabledGroups) {
    TOOL_REGISTRARS[group](server);
  }

  console.error(`Registered tool groups: ${enabledGroups.join(', ')}`);
  return server;
}

/**
 * Determine which tool groups to enable.
 * If ENABLED_TOOL_GROUPS is set, parse it as a comma-separated list and
 * filter out any invalid group names. Otherwise return all groups.
 */
function getEnabledToolGroups(): ToolGroup[] {
  const envGroups = process.env.ENABLED_TOOL_GROUPS;
  if (!envGroups) return [...TOOL_GROUPS];

  const requested = envGroups.split(',').map(g => g.trim());
  return requested.filter((g): g is ToolGroup =>
    (TOOL_GROUPS as readonly string[]).includes(g)
  );
}
