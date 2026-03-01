import { JiraApiError, buildErrorResult } from '../../../src/utils/errors.js';

describe('JiraApiError', () => {
  it('stores statusCode, message, jiraErrors, and jiraFieldErrors', () => {
    const err = new JiraApiError('Bad request', 400, ['field X is invalid'], { summary: 'required' });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(JiraApiError);
    expect(err.name).toBe('JiraApiError');
    expect(err.message).toBe('Bad request');
    expect(err.statusCode).toBe(400);
    expect(err.jiraErrors).toEqual(['field X is invalid']);
    expect(err.jiraFieldErrors).toEqual({ summary: 'required' });
  });

  it('defaults jiraErrors and jiraFieldErrors to undefined when not provided', () => {
    const err = new JiraApiError('Not found', 404);

    expect(err.statusCode).toBe(404);
    expect(err.jiraErrors).toBeUndefined();
    expect(err.jiraFieldErrors).toBeUndefined();
  });
});

describe('buildErrorResult', () => {
  it('formats JiraApiError with details (jiraErrors and jiraFieldErrors)', () => {
    const err = new JiraApiError(
      'Bad request',
      400,
      ['Invalid JQL query'],
      { assignee: 'User not found' },
    );
    const result = buildErrorResult(err);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Error (400)');
    expect(result.content[0].text).toContain('Bad request');
    expect(result.content[0].text).toContain('Details: Invalid JQL query');
    expect(result.content[0].text).toContain('Field errors:');
    expect(result.content[0].text).toContain('User not found');
  });

  it('formats JiraApiError without details', () => {
    const err = new JiraApiError('Not found', 404);
    const result = buildErrorResult(err);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Error (404)');
    expect(result.content[0].text).toContain('Not found');
    // Should NOT contain "Details:" or "Field errors:" since there are none
    expect(result.content[0].text).not.toContain('Details:');
    expect(result.content[0].text).not.toContain('Field errors:');
  });

  it('formats a generic Error', () => {
    const err = new Error('Something went wrong');
    const result = buildErrorResult(err);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('Error: Something went wrong');
  });

  it('formats a non-Error value (string)', () => {
    const result = buildErrorResult('random failure');

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('Unexpected error: random failure');
  });

  it('always returns isError: true and content[0].type === "text"', () => {
    const cases: unknown[] = [
      new JiraApiError('a', 500),
      new Error('b'),
      'c',
      42,
      null,
      undefined,
    ];

    for (const value of cases) {
      const result = buildErrorResult(value);
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
    }
  });
});
