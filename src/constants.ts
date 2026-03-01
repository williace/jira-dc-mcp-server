export const CHARACTER_LIMIT = 25000;

export const API_PATHS = {
  CORE: '/rest/api/2',
  AGILE: '/rest/agile/1.0',
} as const;

export const DEFAULTS = {
  MAX_RESULTS: 50,
  START_AT: 0,
  SEARCH_MAX_RESULTS: 25,
  COMMENT_MAX_RESULTS: 20,
} as const;

export const TOOL_GROUPS = [
  'issues', 'projects', 'users', 'boards',
  'sprints', 'epics', 'metadata', 'attachments',
] as const;

export type ToolGroup = (typeof TOOL_GROUPS)[number];
