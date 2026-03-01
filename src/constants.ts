/**
 * Shared constants used across the MCP server.
 * Centralised here to avoid magic numbers and make tuning easier.
 */

// Max characters in a single tool response before we truncate to stay within MCP message limits
export const CHARACTER_LIMIT = 25000;

// Jira Data Center REST API base paths (versioned separately by Atlassian)
export const API_PATHS = {
  CORE: '/rest/api/2',
  AGILE: '/rest/agile/1.0',
} as const;

// Default pagination values — keep in sync with the Zod schemas in schemas/common.ts
export const DEFAULTS = {
  MAX_RESULTS: 50,
  START_AT: 0,
  SEARCH_MAX_RESULTS: 25,
  COMMENT_MAX_RESULTS: 20,
} as const;

// Available tool groups that operators can enable/disable via the TOOL_GROUPS env var
export const TOOL_GROUPS = [
  'issues', 'projects', 'users', 'boards',
  'sprints', 'epics', 'metadata', 'attachments',
] as const;

export type ToolGroup = (typeof TOOL_GROUPS)[number];
