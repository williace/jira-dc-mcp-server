import {
  truncateText,
  formatToolResponse,
  formatUser,
  formatIssue,
  formatIssueList,
  formatProject,
  formatSprint,
  formatBoard,
  formatSimpleList,
} from '../../../src/services/formatters.js';
import { buildPaginationMeta } from '../../../src/utils/pagination.js';
import {
  sampleUser,
  sampleIssue,
  sampleIssue2,
  sampleProject,
  sampleSprint,
  sampleBoard,
  samplePriority,
  sampleStatus,
} from '../../helpers/fixtures.js';

describe('truncateText', () => {
  it('returns short text unchanged', () => {
    const text = 'Hello, world!';
    expect(truncateText(text)).toBe(text);
  });

  it('truncates text exceeding 25000 characters with a truncation message', () => {
    const longText = 'x'.repeat(30000);
    const result = truncateText(longText);

    expect(result.length).toBeLessThan(longText.length);
    expect(result).toContain('... [Response truncated');
    // The first 25000 characters should be preserved
    expect(result.startsWith('x'.repeat(25000))).toBe(true);
  });

  it('returns text exactly at the limit unchanged', () => {
    const exactText = 'y'.repeat(25000);
    expect(truncateText(exactText)).toBe(exactText);
  });
});

describe('formatToolResponse', () => {
  it('returns JSON.stringify output when format is "json"', () => {
    const data = { key: 'PROJ-1', summary: 'Test' };
    const markdownFn = vi.fn(() => '# Markdown');
    const result = formatToolResponse(data, 'json', markdownFn);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    expect(markdownFn).not.toHaveBeenCalled();
  });

  it('calls markdownFn and returns its result when format is "markdown"', () => {
    const data = { key: 'PROJ-1' };
    const markdownFn = vi.fn(() => '# Issue PROJ-1');
    const result = formatToolResponse(data, 'markdown', markdownFn);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('# Issue PROJ-1');
    expect(markdownFn).toHaveBeenCalledOnce();
  });
});

describe('formatUser', () => {
  it('includes displayName, username, and email', () => {
    const result = formatUser(sampleUser);

    expect(result).toContain('John Smith');
    expect(result).toContain('jsmith');
    expect(result).toContain('jsmith@example.com');
  });

  it('includes active status and timezone', () => {
    const result = formatUser(sampleUser);

    expect(result).toContain('Active');
    expect(result).toContain('America/New_York');
  });
});

describe('formatIssue', () => {
  it('includes key, summary, status, and priority', () => {
    const result = formatIssue(sampleIssue);

    expect(result).toContain('PROJ-123');
    expect(result).toContain('Fix login bug');
    expect(result).toContain('In Progress');
    expect(result).toContain('High');
  });

  it('includes type, assignee, and reporter', () => {
    const result = formatIssue(sampleIssue);

    expect(result).toContain('Bug');
    expect(result).toContain('John Smith');
    expect(result).toContain('Jane Doe');
  });

  it('includes labels, components, and fix versions', () => {
    const result = formatIssue(sampleIssue);

    expect(result).toContain('sso');
    expect(result).toContain('auth');
    expect(result).toContain('Authentication');
    expect(result).toContain('2.0');
  });

  it('includes description', () => {
    const result = formatIssue(sampleIssue);

    expect(result).toContain('Description');
    expect(result).toContain('Users cannot log in with SSO.');
  });
});

describe('formatIssueList', () => {
  it('lists issues and includes pagination footer', () => {
    const pagination = buildPaginationMeta(0, 50, 2);
    const result = formatIssueList([sampleIssue, sampleIssue2], pagination);

    expect(result).toContain('PROJ-123');
    expect(result).toContain('Fix login bug');
    expect(result).toContain('PROJ-124');
    expect(result).toContain('Add dark mode');
    expect(result).toContain('Showing 1-2 of 2');
  });

  it('shows status and priority for each issue', () => {
    const pagination = buildPaginationMeta(0, 50, 1);
    const result = formatIssueList([sampleIssue], pagination);

    expect(result).toContain('In Progress');
    expect(result).toContain('High');
  });
});

describe('formatProject', () => {
  it('includes name, key, and description', () => {
    const result = formatProject(sampleProject);

    expect(result).toContain('Test Project');
    expect(result).toContain('PROJ');
    expect(result).toContain('A test project for e2e testing.');
  });

  it('includes lead and project type', () => {
    const result = formatProject(sampleProject);

    expect(result).toContain('John Smith');
    expect(result).toContain('software');
  });
});

describe('formatSprint', () => {
  it('includes name, state, and dates', () => {
    const result = formatSprint(sampleSprint);

    expect(result).toContain('Sprint 10');
    expect(result).toContain('active');
    expect(result).toContain('2026-03-01');
    expect(result).toContain('2026-03-15');
  });

  it('includes goal', () => {
    const result = formatSprint(sampleSprint);

    expect(result).toContain('Complete auth module');
  });
});

describe('formatBoard', () => {
  it('includes name, ID, and type', () => {
    const result = formatBoard(sampleBoard);

    expect(result).toContain('PROJ Board');
    expect(result).toContain('42');
    expect(result).toContain('scrum');
  });

  it('includes project location', () => {
    const result = formatBoard(sampleBoard);

    expect(result).toContain('PROJ');
    expect(result).toContain('Test Project');
  });
});

describe('formatSimpleList', () => {
  it('formats a list of priorities', () => {
    const priorities = [
      samplePriority,
      { id: '3', name: 'Medium', description: 'Medium priority' },
    ];
    const result = formatSimpleList('Priorities', priorities);

    expect(result).toContain('Priorities (2)');
    expect(result).toContain('High');
    expect(result).toContain('High priority issue');
    expect(result).toContain('Medium');
  });

  it('formats a list of statuses', () => {
    const statuses = [sampleStatus];
    const result = formatSimpleList('Statuses', statuses);

    expect(result).toContain('Statuses (1)');
    expect(result).toContain('In Progress');
    expect(result).toContain('Work is underway');
  });

  it('handles empty list', () => {
    const result = formatSimpleList('Items', []);

    expect(result).toContain('Items (0)');
  });
});
