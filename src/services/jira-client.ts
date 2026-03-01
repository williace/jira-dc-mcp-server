/**
 * HTTP client for the Jira Data Center REST API.
 * Wraps axios with PAT-based authentication, a 30-second timeout, and
 * structured error mapping. Uses a lazy singleton pattern — the client is
 * created on first use and reused for all subsequent requests.
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { JiraApiError } from '../utils/errors.js';
import type { JiraErrorResponse } from '../types.js';

// Lazy singleton — initialized on first call to getJiraClient().
let clientInstance: JiraClient | null = null;

export class JiraClient {
  private client: AxiosInstance;

  /** Reads JIRA_BASE_URL and JIRA_PAT from environment. Strips trailing slashes from the base URL. */
  constructor() {
    const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
    const pat = process.env.JIRA_PAT;

    if (!baseUrl) throw new Error('JIRA_BASE_URL environment variable is required');
    if (!pat) throw new Error('JIRA_PAT environment variable is required');

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const response = await this.client.get<T>(path, { params });
      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    try {
      const response = await this.client.post<T>(path, data);
      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async put<T>(path: string, data?: unknown): Promise<T> {
    try {
      const response = await this.client.put<T>(path, data);
      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      const response = await this.client.delete<T>(path);
      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /** Used for file uploads (attachments). Sets X-Atlassian-Token to bypass Jira's XSRF check. */
  async postMultipart<T>(path: string, formData: FormData): Promise<T> {
    try {
      const response = await this.client.post<T>(path, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Atlassian-Token': 'no-check',
        },
      });
      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /** Converts axios errors into JiraApiError with human-readable messages and actionable hints. */
  private mapError(error: unknown): JiraApiError {
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status;
      const data = error.response.data as JiraErrorResponse | undefined;
      const errorMessages = data?.errorMessages ?? [];
      const fieldErrors = data?.errors ?? {};

      let message: string;
      switch (status) {
        case 400:
          message = 'Bad request. Check field names, values, and required fields.';
          break;
        case 401:
          message = 'Authentication failed. Verify JIRA_PAT is valid and not expired.';
          break;
        case 403:
          message = 'Permission denied. The PAT user lacks permission for this operation.';
          break;
        case 404:
          message = 'Not found. Verify the resource ID/key exists and is accessible.';
          break;
        case 409:
          message = 'Conflict. The resource may have been modified concurrently. Retry with latest data.';
          break;
        case 429:
          message = 'Rate limited. Wait before retrying.';
          break;
        default:
          if (status >= 500) {
            message = `Jira server error (${status}). Try again later.`;
          } else {
            message = `API request failed with status ${status}.`;
          }
      }
      return new JiraApiError(message, status, errorMessages, fieldErrors);
    }
    if (error instanceof AxiosError && error.code === 'ECONNABORTED') {
      return new JiraApiError('Request timed out. Try again or check Jira server availability.', 0);
    }
    if (error instanceof AxiosError && error.code === 'ECONNREFUSED') {
      return new JiraApiError('Connection refused. Verify JIRA_BASE_URL is correct and the server is running.', 0);
    }
    if (error instanceof Error) {
      return new JiraApiError(error.message, 0);
    }
    return new JiraApiError(String(error), 0);
  }
}

/** Returns the singleton JiraClient instance, creating it on first call. */
export function getJiraClient(): JiraClient {
  if (!clientInstance) {
    clientInstance = new JiraClient();
  }
  return clientInstance;
}
