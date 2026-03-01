/**
 * Reusable Zod validation schemas shared across tool definitions.
 * These ensure consistent parameter validation and provide descriptions
 * that MCP clients display to users.
 */

import { z } from 'zod';

export const PaginationSchema = {
  startAt: z.number().int().min(0).default(0)
    .describe('Index of the first result to return (0-based). Use with maxResults for pagination.'),
  maxResults: z.number().int().min(1).max(100).default(50)
    .describe('Maximum number of results to return per page (1-100, default 50).'),
};

export const ResponseFormatSchema = z.enum(['markdown', 'json']).default('markdown')
  .describe('Response format: "markdown" for human-readable, "json" for structured data.');

export const IssueIdOrKeySchema = z.string().min(1)
  .describe('Issue ID (numeric) or issue key (e.g., "PROJ-123").');

export const ProjectIdOrKeySchema = z.string().min(1)
  .describe('Project ID (numeric) or project key (e.g., "PROJ").');

export const BoardIdSchema = z.number().int().positive()
  .describe('Board ID (numeric).');

export const SprintIdSchema = z.number().int().positive()
  .describe('Sprint ID (numeric).');

export const FieldsSchema = z.array(z.string()).optional()
  .describe('List of field names to include in the response. Use "*all" for all fields, or omit for default fields.');

export const ExpandSchema = z.array(z.string()).optional()
  .describe('List of expand parameters (e.g., ["renderedFields", "changelog"]).');

export const JqlSchema = z.string().min(1)
  .describe('JQL query string (e.g., \'project = PROJ AND status = "In Progress"\').');

export const VisibilitySchema = z.object({
  type: z.enum(['group', 'role']).describe('Visibility type: "group" or "role".'),
  value: z.string().describe('Group name or role name for visibility restriction.'),
}).strict().optional()
  .describe('Optional visibility restriction for the comment.');
