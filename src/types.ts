export interface JiraUser {
  self?: string;
  key?: string;
  name?: string;
  emailAddress?: string;
  displayName?: string;
  active?: boolean;
  timeZone?: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraIssueType {
  self?: string;
  id?: string;
  name?: string;
  description?: string;
  subtask?: boolean;
  iconUrl?: string;
}

export interface JiraPriority {
  self?: string;
  id?: string;
  name?: string;
  description?: string;
  iconUrl?: string;
}

export interface JiraStatus {
  self?: string;
  id?: string;
  name?: string;
  description?: string;
  statusCategory?: {
    self?: string;
    id?: number;
    key?: string;
    colorName?: string;
    name?: string;
  };
}

export interface JiraResolution {
  self?: string;
  id?: string;
  name?: string;
  description?: string;
}

export interface JiraComponent {
  self?: string;
  id?: string;
  name?: string;
  description?: string;
  lead?: JiraUser;
  assigneeType?: string;
  project?: string;
  projectId?: number;
}

export interface JiraVersion {
  self?: string;
  id?: string;
  name?: string;
  description?: string;
  archived?: boolean;
  released?: boolean;
  releaseDate?: string;
  startDate?: string;
  projectId?: number;
}

export interface JiraComment {
  self?: string;
  id?: string;
  author?: JiraUser;
  body?: string;
  updateAuthor?: JiraUser;
  created?: string;
  updated?: string;
  visibility?: {
    type?: string;
    value?: string;
  };
}

export interface JiraWorklog {
  self?: string;
  id?: string;
  author?: JiraUser;
  updateAuthor?: JiraUser;
  comment?: string;
  created?: string;
  updated?: string;
  started?: string;
  timeSpent?: string;
  timeSpentSeconds?: number;
}

export interface JiraAttachment {
  self?: string;
  id?: string;
  filename?: string;
  author?: JiraUser;
  created?: string;
  size?: number;
  mimeType?: string;
  content?: string;
}

export interface JiraTransition {
  id?: string;
  name?: string;
  to?: JiraStatus;
  hasScreen?: boolean;
  isGlobal?: boolean;
  isInitial?: boolean;
  isConditional?: boolean;
}

export interface JiraRemoteLink {
  id?: number;
  self?: string;
  globalId?: string;
  application?: {
    type?: string;
    name?: string;
  };
  relationship?: string;
  object?: {
    url?: string;
    title?: string;
    summary?: string;
    icon?: { url16x16?: string; title?: string };
    status?: { resolved?: boolean; icon?: { url16x16?: string; title?: string } };
  };
}

export interface JiraIssue {
  id?: string;
  self?: string;
  key?: string;
  expand?: string;
  fields?: {
    summary?: string;
    description?: string;
    issuetype?: JiraIssueType;
    status?: JiraStatus;
    priority?: JiraPriority;
    assignee?: JiraUser;
    reporter?: JiraUser;
    creator?: JiraUser;
    created?: string;
    updated?: string;
    resolutiondate?: string;
    resolution?: JiraResolution;
    labels?: string[];
    components?: JiraComponent[];
    fixVersions?: JiraVersion[];
    versions?: JiraVersion[];
    project?: {
      self?: string;
      id?: string;
      key?: string;
      name?: string;
    };
    parent?: {
      id?: string;
      key?: string;
      self?: string;
      fields?: { summary?: string; status?: JiraStatus; issuetype?: JiraIssueType };
    };
    subtasks?: JiraIssue[];
    comment?: { comments?: JiraComment[]; total?: number };
    worklog?: { worklogs?: JiraWorklog[]; total?: number };
    attachment?: JiraAttachment[];
    timetracking?: {
      originalEstimate?: string;
      remainingEstimate?: string;
      timeSpent?: string;
      originalEstimateSeconds?: number;
      remainingEstimateSeconds?: number;
      timeSpentSeconds?: number;
    };
    [key: string]: unknown;
  };
}

export interface JiraProject {
  self?: string;
  id?: string;
  key?: string;
  name?: string;
  description?: string;
  lead?: JiraUser;
  projectCategory?: { self?: string; id?: string; name?: string; description?: string };
  projectTypeKey?: string;
  avatarUrls?: Record<string, string>;
  roles?: Record<string, string>;
  issueTypes?: JiraIssueType[];
  components?: JiraComponent[];
  versions?: JiraVersion[];
}

export interface JiraFilter {
  self?: string;
  id?: string;
  name?: string;
  description?: string;
  owner?: JiraUser;
  jql?: string;
  viewUrl?: string;
  searchUrl?: string;
  favourite?: boolean;
}

export interface JiraDashboard {
  id?: string;
  name?: string;
  self?: string;
  view?: string;
}

export interface JiraField {
  id?: string;
  name?: string;
  custom?: boolean;
  orderable?: boolean;
  navigable?: boolean;
  searchable?: boolean;
  clauseNames?: string[];
  schema?: { type?: string; system?: string; custom?: string; customId?: number };
}

export interface JiraBoard {
  id?: number;
  self?: string;
  name?: string;
  type?: string;
  location?: {
    projectId?: number;
    projectName?: string;
    projectKey?: string;
    projectTypeKey?: string;
    displayName?: string;
    avatarURI?: string;
    name?: string;
  };
}

export interface JiraBoardConfiguration {
  id?: number;
  name?: string;
  self?: string;
  filter?: { id?: string; self?: string };
  columnConfig?: {
    columns?: Array<{
      name?: string;
      statuses?: Array<{ id?: string; self?: string }>;
    }>;
  };
  estimation?: { type?: string; field?: { fieldId?: string; displayName?: string } };
  ranking?: { rankCustomFieldId?: number };
}

export interface JiraSprint {
  id?: number;
  self?: string;
  state?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId?: number;
  goal?: string;
}

export interface JiraEpic {
  id?: number;
  self?: string;
  key?: string;
  name?: string;
  summary?: string;
  done?: boolean;
  color?: { key?: string };
}

export interface PaginatedResponse<T> {
  startAt: number;
  maxResults: number;
  total: number;
  values?: T[];
  issues?: T[];
}

export interface JiraSearchResult {
  expand?: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraErrorResponse {
  errorMessages?: string[];
  errors?: Record<string, string>;
}

export type ResponseFormat = 'markdown' | 'json';
