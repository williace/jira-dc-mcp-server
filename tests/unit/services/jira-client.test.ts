import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
  AxiosError: class AxiosError extends Error {
    response?: any;
    code?: string;
    constructor(msg: string, code?: string, config?: any, request?: any, response?: any) {
      super(msg);
      this.name = 'AxiosError';
      this.code = code;
      this.response = response;
    }
    isAxiosError = true;
  },
}));

import { JiraClient } from '../../../src/services/jira-client.js';
import { JiraApiError } from '../../../src/utils/errors.js';
import { AxiosError } from 'axios';

describe('JiraClient', () => {
  let client: JiraClient;

  beforeEach(() => {
    // Env vars are set in tests/setup.ts; reset mocks between tests
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.delete.mockReset();
    client = new JiraClient();
  });

  describe('constructor', () => {
    it('reads JIRA_BASE_URL and JIRA_PAT from environment', () => {
      // If the constructor didn't throw, it successfully read the env vars.
      expect(client).toBeInstanceOf(JiraClient);
    });

    it('throws when JIRA_BASE_URL is missing', () => {
      const origUrl = process.env.JIRA_BASE_URL;
      delete process.env.JIRA_BASE_URL;
      try {
        expect(() => new JiraClient()).toThrow('JIRA_BASE_URL environment variable is required');
      } finally {
        process.env.JIRA_BASE_URL = origUrl;
      }
    });

    it('throws when JIRA_PAT is missing', () => {
      const origPat = process.env.JIRA_PAT;
      delete process.env.JIRA_PAT;
      try {
        expect(() => new JiraClient()).toThrow('JIRA_PAT environment variable is required');
      } finally {
        process.env.JIRA_PAT = origPat;
      }
    });
  });

  describe('get', () => {
    it('returns response.data on success', async () => {
      const data = { id: '10001', key: 'PROJ-123' };
      mockAxiosInstance.get.mockResolvedValue({ data });

      const result = await client.get('/rest/api/2/issue/PROJ-123');

      expect(result).toEqual(data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/rest/api/2/issue/PROJ-123', { params: undefined });
    });

    it('passes query params to axios', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      await client.get('/rest/api/2/search', { jql: 'project=PROJ', maxResults: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/rest/api/2/search', {
        params: { jql: 'project=PROJ', maxResults: 10 },
      });
    });
  });

  describe('post', () => {
    it('sends data and returns response.data', async () => {
      const reqBody = { fields: { summary: 'New issue' } };
      const resData = { id: '10003', key: 'PROJ-125' };
      mockAxiosInstance.post.mockResolvedValue({ data: resData });

      const result = await client.post('/rest/api/2/issue', reqBody);

      expect(result).toEqual(resData);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/rest/api/2/issue', reqBody);
    });
  });

  describe('put', () => {
    it('sends data and returns response.data', async () => {
      const reqBody = { fields: { summary: 'Updated' } };
      const resData = { id: '10001' };
      mockAxiosInstance.put.mockResolvedValue({ data: resData });

      const result = await client.put('/rest/api/2/issue/PROJ-123', reqBody);

      expect(result).toEqual(resData);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/rest/api/2/issue/PROJ-123', reqBody);
    });
  });

  describe('delete', () => {
    it('returns response.data on success', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: undefined });

      const result = await client.delete('/rest/api/2/issue/PROJ-123');

      expect(result).toBeUndefined();
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/rest/api/2/issue/PROJ-123');
    });
  });

  describe('error mapping', () => {
    it('maps 400 to "Bad request"', async () => {
      const axiosErr = new AxiosError('Request failed', '400', undefined, undefined, {
        status: 400,
        data: { errorMessages: ['Invalid field'], errors: { summary: 'Field is required' } },
      });
      mockAxiosInstance.get.mockRejectedValue(axiosErr);

      await expect(client.get('/test')).rejects.toThrow(JiraApiError);
      await expect(client.get('/test')).rejects.toThrow(/Bad request/);
    });

    it('maps 401 to "Authentication failed"', async () => {
      const axiosErr = new AxiosError('Unauthorized', '401', undefined, undefined, {
        status: 401,
        data: { errorMessages: [], errors: {} },
      });
      mockAxiosInstance.get.mockRejectedValue(axiosErr);

      await expect(client.get('/test')).rejects.toThrow(JiraApiError);
      await expect(client.get('/test')).rejects.toThrow(/Authentication failed/);
    });

    it('maps 403 to "Permission denied"', async () => {
      const axiosErr = new AxiosError('Forbidden', '403', undefined, undefined, {
        status: 403,
        data: { errorMessages: [], errors: {} },
      });
      mockAxiosInstance.get.mockRejectedValue(axiosErr);

      await expect(client.get('/test')).rejects.toThrow(JiraApiError);
      await expect(client.get('/test')).rejects.toThrow(/Permission denied/);
    });

    it('maps 404 to "Not found"', async () => {
      const axiosErr = new AxiosError('Not Found', '404', undefined, undefined, {
        status: 404,
        data: { errorMessages: ['Issue Does Not Exist'], errors: {} },
      });
      mockAxiosInstance.get.mockRejectedValue(axiosErr);

      await expect(client.get('/test')).rejects.toThrow(JiraApiError);
      await expect(client.get('/test')).rejects.toThrow(/Not found/);
    });

    it('maps ECONNABORTED to "Request timed out"', async () => {
      const axiosErr = new AxiosError('timeout', 'ECONNABORTED');
      mockAxiosInstance.get.mockRejectedValue(axiosErr);

      await expect(client.get('/test')).rejects.toThrow(JiraApiError);
      await expect(client.get('/test')).rejects.toThrow(/Request timed out/);
    });

    it('maps ECONNREFUSED to "Connection refused"', async () => {
      const axiosErr = new AxiosError('connect failed', 'ECONNREFUSED');
      mockAxiosInstance.get.mockRejectedValue(axiosErr);

      await expect(client.get('/test')).rejects.toThrow(JiraApiError);
      await expect(client.get('/test')).rejects.toThrow(/Connection refused/);
    });

    it('preserves jiraErrors and jiraFieldErrors from response body', async () => {
      const axiosErr = new AxiosError('Bad request', '400', undefined, undefined, {
        status: 400,
        data: {
          errorMessages: ['JQL parse error', 'Another error'],
          errors: { assignee: 'User does not exist' },
        },
      });
      mockAxiosInstance.get.mockRejectedValue(axiosErr);

      try {
        await client.get('/test');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(JiraApiError);
        const jiraErr = err as JiraApiError;
        expect(jiraErr.statusCode).toBe(400);
        expect(jiraErr.jiraErrors).toEqual(['JQL parse error', 'Another error']);
        expect(jiraErr.jiraFieldErrors).toEqual({ assignee: 'User does not exist' });
      }
    });

    it('wraps generic Error into JiraApiError', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Something unexpected'));

      await expect(client.get('/test')).rejects.toThrow(JiraApiError);
      await expect(client.get('/test')).rejects.toThrow(/Something unexpected/);
    });

    it('wraps non-Error values into JiraApiError', async () => {
      mockAxiosInstance.get.mockRejectedValue('string error');

      await expect(client.get('/test')).rejects.toThrow(JiraApiError);
      await expect(client.get('/test')).rejects.toThrow(/string error/);
    });
  });
});
