import { vi } from 'vitest';

/**
 * Creates a mock JiraClient with all HTTP methods stubbed.
 * Each test can configure return values via mockResolvedValueOnce / mockRejectedValueOnce.
 */
export function createMockJiraClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postMultipart: vi.fn(),
  };
}

/** Shared mock instance used by all tool handler tests. */
export const mockClient = createMockJiraClient();
