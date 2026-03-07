import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from '../../helpers/mock-jira-client.js';

vi.mock('../../../src/services/jira-client.js', () => ({
  getJiraClient: () => mockClient,
  JiraClient: vi.fn(),
}));

import { createTestClient } from '../../helpers/test-server.js';
import { registerProjectTools } from '../../../src/tools/projects.js';
import {
  sampleProject,
  sampleProject2,
  sampleComponent,
  sampleVersion,
} from '../../helpers/fixtures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Project Tools', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const ctx = await createTestClient(registerProjectTools);
    client = ctx.client;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // ── jira_list_projects ────────────────────────────────────────────

  it('jira_list_projects returns all projects', async () => {
    mockClient.get.mockResolvedValueOnce([sampleProject, sampleProject2]);

    const result = await client.callTool({
      name: 'jira_list_projects',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Test Project');
    expect(text).toContain('Operations');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/project');
  });

  // ── jira_get_project ──────────────────────────────────────────────

  it('jira_get_project returns project details', async () => {
    mockClient.get.mockResolvedValueOnce(sampleProject);

    const result = await client.callTool({
      name: 'jira_get_project',
      arguments: { projectIdOrKey: 'PROJ' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Test Project');
    expect(text).toContain('PROJ');
  });

  // ── jira_get_project_components ───────────────────────────────────

  it('jira_get_project_components returns components', async () => {
    mockClient.get.mockResolvedValueOnce([sampleComponent]);

    const result = await client.callTool({
      name: 'jira_get_project_components',
      arguments: { projectIdOrKey: 'PROJ' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Authentication');
  });

  // ── jira_get_project_versions ─────────────────────────────────────

  it('jira_get_project_versions returns versions', async () => {
    mockClient.get.mockResolvedValueOnce([sampleVersion]);

    const result = await client.callTool({
      name: 'jira_get_project_versions',
      arguments: { projectIdOrKey: 'PROJ' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('2.0');
  });

  // ── jira_create_component (in place of jira_create_project) ───────

  it('jira_create_component creates a component', async () => {
    mockClient.post.mockResolvedValueOnce(sampleComponent);

    const result = await client.callTool({
      name: 'jira_create_component',
      arguments: {
        projectKey: 'PROJ',
        name: 'Authentication',
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Authentication');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/api/2/component',
      expect.objectContaining({ project: 'PROJ', name: 'Authentication' }),
    );
  });

  // ── jira_delete_version (uses POST /removeAndSwap since Jira 10) ──

  it('jira_delete_version deletes with move targets', async () => {
    mockClient.post.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_delete_version',
      arguments: {
        versionId: '10200',
        moveFixIssuesTo: '10201',
        moveAffectedIssuesTo: '10202',
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('deleted successfully');
    expect(text).toContain('10201');
    expect(text).toContain('10202');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/api/2/version/10200/removeAndSwap',
      { moveFixIssuesTo: '10201', moveAffectedIssuesTo: '10202' },
    );
  });

  it('jira_delete_version deletes without move targets', async () => {
    mockClient.post.mockResolvedValueOnce(undefined);

    const result = await client.callTool({
      name: 'jira_delete_version',
      arguments: { versionId: '10200' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('deleted successfully');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/api/2/version/10200/removeAndSwap',
      {},
    );
  });
});
