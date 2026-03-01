/**
 * Error handling utilities for converting Jira API errors into
 * MCP-compatible error responses.
 */

/** Custom error class that carries Jira-specific error details (HTTP status, field-level errors). */
export class JiraApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public jiraErrors?: string[],
    public jiraFieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

/** Converts any caught error into the MCP tool response format with `isError: true`. */
export function buildErrorResult(error: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  if (error instanceof JiraApiError) {
    const parts = [`Error (${error.statusCode}): ${error.message}`];
    if (error.jiraErrors?.length) {
      parts.push(`Details: ${error.jiraErrors.join('; ')}`);
    }
    if (error.jiraFieldErrors && Object.keys(error.jiraFieldErrors).length > 0) {
      parts.push(`Field errors: ${JSON.stringify(error.jiraFieldErrors)}`);
    }
    return {
      content: [{ type: 'text' as const, text: parts.join('\n') }],
      isError: true,
    };
  }
  if (error instanceof Error) {
    return {
      content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
      isError: true,
    };
  }
  return {
    content: [{ type: 'text' as const, text: `Unexpected error: ${String(error)}` }],
    isError: true,
  };
}
