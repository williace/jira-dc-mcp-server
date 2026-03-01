import type {
  JiraUser, JiraIssue, JiraProject, JiraBoard, JiraSprint, JiraEpic,
  JiraComment, JiraField, JiraPriority, JiraStatus, JiraIssueType,
  JiraResolution, JiraFilter, JiraDashboard, JiraAttachment,
  JiraTransition, JiraWorklog, JiraRemoteLink, JiraComponent, JiraVersion,
  JiraBoardConfiguration,
} from '../../src/types.js';

// ── Users ──────────────────────────────────────────────────────────

export const sampleUser: JiraUser = {
  name: 'jsmith',
  displayName: 'John Smith',
  emailAddress: 'jsmith@example.com',
  active: true,
  timeZone: 'America/New_York',
};

export const sampleUser2: JiraUser = {
  name: 'jdoe',
  displayName: 'Jane Doe',
  emailAddress: 'jdoe@example.com',
  active: true,
  timeZone: 'Europe/London',
};

// ── Issues ─────────────────────────────────────────────────────────

export const sampleIssue: JiraIssue = {
  id: '10001',
  key: 'PROJ-123',
  self: 'https://jira.test.example.com/rest/api/2/issue/10001',
  fields: {
    summary: 'Fix login bug',
    status: { name: 'In Progress', id: '3' },
    priority: { name: 'High', id: '2' },
    issuetype: { name: 'Bug', id: '1' },
    assignee: sampleUser,
    reporter: sampleUser2,
    created: '2026-01-15T10:00:00.000+0000',
    updated: '2026-02-20T14:30:00.000+0000',
    description: 'Users cannot log in with SSO.',
    project: { key: 'PROJ', name: 'Test Project', id: '10000' },
    labels: ['sso', 'auth'],
    components: [{ name: 'Authentication', id: '10100' }],
    fixVersions: [{ name: '2.0', id: '10200' }],
  },
};

export const sampleIssue2: JiraIssue = {
  id: '10002',
  key: 'PROJ-124',
  self: 'https://jira.test.example.com/rest/api/2/issue/10002',
  fields: {
    summary: 'Add dark mode',
    status: { name: 'To Do', id: '1' },
    priority: { name: 'Medium', id: '3' },
    issuetype: { name: 'Story', id: '2' },
    assignee: sampleUser2,
    reporter: sampleUser,
  },
};

export const sampleCreateIssueResponse = {
  id: '10003',
  key: 'PROJ-125',
  self: 'https://jira.test.example.com/rest/api/2/issue/10003',
};

// ── Projects ───────────────────────────────────────────────────────

export const sampleProject: JiraProject = {
  id: '10000',
  key: 'PROJ',
  name: 'Test Project',
  description: 'A test project for e2e testing.',
  lead: sampleUser,
  projectTypeKey: 'software',
};

export const sampleProject2: JiraProject = {
  id: '10001',
  key: 'OPS',
  name: 'Operations',
  lead: sampleUser2,
  projectTypeKey: 'business',
};

// ── Components & Versions ──────────────────────────────────────────

export const sampleComponent: JiraComponent = {
  id: '10100',
  name: 'Authentication',
  description: 'Auth module',
  lead: sampleUser,
};

export const sampleVersion: JiraVersion = {
  id: '10200',
  name: '2.0',
  description: 'Major release',
  released: false,
  archived: false,
  releaseDate: '2026-06-01',
};

// ── Boards ─────────────────────────────────────────────────────────

export const sampleBoard: JiraBoard = {
  id: 42,
  name: 'PROJ Board',
  type: 'scrum',
  location: { projectKey: 'PROJ', projectName: 'Test Project' },
};

export const sampleBoardConfig: JiraBoardConfiguration = {
  id: 42,
  name: 'PROJ Board',
  filter: { id: '100' },
  estimation: { type: 'story_points', field: { displayName: 'Story Points' } },
  columnConfig: {
    columns: [
      { name: 'To Do', statuses: [{ id: '1' }] },
      { name: 'In Progress', statuses: [{ id: '3' }] },
      { name: 'Done', statuses: [{ id: '5' }] },
    ],
  },
};

// ── Sprints ────────────────────────────────────────────────────────

export const sampleSprint: JiraSprint = {
  id: 100,
  name: 'Sprint 10',
  state: 'active',
  startDate: '2026-03-01T09:00:00.000Z',
  endDate: '2026-03-15T17:00:00.000Z',
  originBoardId: 42,
  goal: 'Complete auth module',
};

// ── Epics ──────────────────────────────────────────────────────────

export const sampleEpic: JiraEpic = {
  id: 10500,
  key: 'PROJ-100',
  name: 'Auth Epic',
  summary: 'All authentication work',
  done: false,
  color: { key: 'color_1' },
};

// ── Comments ───────────────────────────────────────────────────────

export const sampleComment: JiraComment = {
  id: '20001',
  author: sampleUser,
  body: 'This is a test comment.',
  created: '2026-02-20T14:30:00.000+0000',
  updated: '2026-02-20T14:30:00.000+0000',
};

// ── Worklogs ───────────────────────────────────────────────────────

export const sampleWorklog: JiraWorklog = {
  id: '30001',
  author: sampleUser,
  timeSpent: '2h',
  started: '2026-02-20T10:00:00.000+0000',
  comment: 'Investigated bug',
};

// ── Transitions ────────────────────────────────────────────────────

export const sampleTransitions: JiraTransition[] = [
  { id: '11', name: 'Start Progress', to: { name: 'In Progress', id: '3' } },
  { id: '21', name: 'Done', to: { name: 'Done', id: '5' } },
];

// ── Remote Links ───────────────────────────────────────────────────

export const sampleRemoteLink: JiraRemoteLink = {
  id: 40001,
  object: { url: 'https://github.com/org/repo/pull/1', title: 'PR #1' },
  relationship: 'links to',
};

// ── Metadata ───────────────────────────────────────────────────────

export const sampleField: JiraField = {
  id: 'summary',
  name: 'Summary',
  custom: false,
  schema: { type: 'string' },
};

export const sampleCustomField: JiraField = {
  id: 'customfield_10001',
  name: 'Story Points',
  custom: true,
  schema: { type: 'number' },
};

export const samplePriority: JiraPriority = {
  id: '2',
  name: 'High',
  description: 'High priority issue',
};

export const sampleStatus: JiraStatus = {
  id: '3',
  name: 'In Progress',
  description: 'Work is underway',
  statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress', colorName: 'yellow' },
};

export const sampleIssueType: JiraIssueType = {
  id: '1',
  name: 'Bug',
  description: 'A defect',
  subtask: false,
};

export const sampleResolution: JiraResolution = {
  id: '1',
  name: 'Done',
  description: 'Work is complete',
};

export const sampleFilter: JiraFilter = {
  id: '12345',
  name: 'My Open Bugs',
  jql: 'project = PROJ AND type = Bug AND status != Done',
  owner: sampleUser,
  viewUrl: 'https://jira.test.example.com/issues/?filter=12345',
};

export const sampleDashboard: JiraDashboard = {
  id: '50001',
  name: 'Team Dashboard',
  view: 'https://jira.test.example.com/secure/Dashboard.jspa?selectPageId=50001',
};

// ── Attachments ────────────────────────────────────────────────────

export const sampleAttachment: JiraAttachment = {
  id: '60001',
  filename: 'screenshot.png',
  mimeType: 'image/png',
  size: 12345,
  author: sampleUser,
  created: '2026-02-20T14:30:00.000+0000',
  content: 'https://jira.test.example.com/secure/attachment/60001/screenshot.png',
};
