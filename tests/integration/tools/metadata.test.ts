import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from '../../helpers/mock-jira-client.js';

vi.mock('../../../src/services/jira-client.js', () => ({
  getJiraClient: () => mockClient,
  JiraClient: vi.fn(),
}));

import { createTestClient } from '../../helpers/test-server.js';
import { registerMetadataTools } from '../../../src/tools/metadata.js';
import {
  sampleField,
  sampleCustomField,
  samplePriority,
  sampleStatus,
  sampleIssueType,
  sampleResolution,
  sampleFilter,
  sampleDashboard,
} from '../../helpers/fixtures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('Metadata Tools', () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const ctx = await createTestClient(registerMetadataTools);
    client = ctx.client;
    cleanup = ctx.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  // ── jira_list_fields ──────────────────────────────────────────────

  it('jira_list_fields returns system and custom fields', async () => {
    mockClient.get.mockResolvedValueOnce([sampleField, sampleCustomField]);

    const result = await client.callTool({
      name: 'jira_list_fields',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Summary');
    expect(text).toContain('Story Points');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/field');
  });

  // ── jira_list_priorities ──────────────────────────────────────────

  it('jira_list_priorities returns priorities', async () => {
    mockClient.get.mockResolvedValueOnce([samplePriority]);

    const result = await client.callTool({
      name: 'jira_list_priorities',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('High');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/priority');
  });

  // ── jira_list_statuses ────────────────────────────────────────────

  it('jira_list_statuses returns statuses', async () => {
    mockClient.get.mockResolvedValueOnce([sampleStatus]);

    const result = await client.callTool({
      name: 'jira_list_statuses',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('In Progress');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/status');
  });

  // ── jira_list_issue_types ─────────────────────────────────────────

  it('jira_list_issue_types returns issue types', async () => {
    mockClient.get.mockResolvedValueOnce([sampleIssueType]);

    const result = await client.callTool({
      name: 'jira_list_issue_types',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Bug');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/issuetype');
  });

  // ── jira_list_resolutions ─────────────────────────────────────────

  it('jira_list_resolutions returns resolutions', async () => {
    mockClient.get.mockResolvedValueOnce([sampleResolution]);

    const result = await client.callTool({
      name: 'jira_list_resolutions',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Done');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/resolution');
  });

  // ── jira_get_filter ───────────────────────────────────────────────

  it('jira_get_filter returns filter details', async () => {
    mockClient.get.mockResolvedValueOnce(sampleFilter);

    const result = await client.callTool({
      name: 'jira_get_filter',
      arguments: { filterId: '12345' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('My Open Bugs');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/filter/12345');
  });

  // ── jira_get_favourite_filters ────────────────────────────────────

  it('jira_get_favourite_filters returns favourite filters', async () => {
    mockClient.get.mockResolvedValueOnce([sampleFilter]);

    const result = await client.callTool({
      name: 'jira_get_favourite_filters',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('My Open Bugs');
    expect(mockClient.get).toHaveBeenCalledWith('/rest/api/2/filter/favourite');
  });

  // ── jira_create_filter ────────────────────────────────────────────

  it('jira_create_filter creates a filter', async () => {
    mockClient.post.mockResolvedValueOnce(sampleFilter);

    const result = await client.callTool({
      name: 'jira_create_filter',
      arguments: {
        name: 'My Open Bugs',
        jql: 'project = PROJ AND type = Bug AND status != Done',
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Filter created: My Open Bugs');
    expect(text).toContain('12345');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/rest/api/2/filter',
      expect.objectContaining({
        name: 'My Open Bugs',
        jql: 'project = PROJ AND type = Bug AND status != Done',
      }),
    );
  });

  // ── jira_list_dashboards ──────────────────────────────────────────

  it('jira_list_dashboards returns dashboards', async () => {
    mockClient.get.mockResolvedValueOnce({ dashboards: [sampleDashboard] });

    const result = await client.callTool({
      name: 'jira_list_dashboards',
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Team Dashboard');
    expect(mockClient.get).toHaveBeenCalledWith(
      '/rest/api/2/dashboard',
      expect.objectContaining({ startAt: 0, maxResults: 50 }),
    );
  });
});
