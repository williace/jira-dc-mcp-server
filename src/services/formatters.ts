import { CHARACTER_LIMIT } from '../constants.js';
import type {
  JiraIssue, JiraProject, JiraUser, JiraComment, JiraWorklog,
  JiraBoard, JiraSprint, JiraEpic, JiraComponent, JiraVersion,
  JiraField, JiraPriority, JiraStatus, JiraIssueType, JiraResolution,
  JiraFilter, JiraDashboard, JiraTransition, JiraRemoteLink,
  JiraBoardConfiguration, JiraAttachment, ResponseFormat,
} from '../types.js';
import { PaginationMeta, formatPaginationFooter } from '../utils/pagination.js';

export function truncateText(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return text.slice(0, CHARACTER_LIMIT) +
    '\n\n... [Response truncated. Use pagination or field filtering to retrieve more data.]';
}

export function formatToolResponse(
  data: unknown,
  format: ResponseFormat,
  markdownFn: () => string
): { content: Array<{ type: 'text'; text: string }> } {
  const text = format === 'json'
    ? JSON.stringify(data, null, 2)
    : markdownFn();
  return { content: [{ type: 'text' as const, text: truncateText(text) }] };
}

export function formatIssue(issue: JiraIssue): string {
  const f = issue.fields;
  const lines: string[] = [];
  lines.push(`# ${issue.key}: ${f?.summary ?? 'No summary'}`);
  lines.push('');
  if (f?.status) lines.push(`- **Status**: ${f.status.name}`);
  if (f?.priority) lines.push(`- **Priority**: ${f.priority.name}`);
  if (f?.issuetype) lines.push(`- **Type**: ${f.issuetype.name}`);
  if (f?.assignee) lines.push(`- **Assignee**: ${f.assignee.displayName ?? f.assignee.name}`);
  if (f?.reporter) lines.push(`- **Reporter**: ${f.reporter.displayName ?? f.reporter.name}`);
  if (f?.resolution) lines.push(`- **Resolution**: ${f.resolution.name}`);
  if (f?.labels?.length) lines.push(`- **Labels**: ${f.labels.join(', ')}`);
  if (f?.components?.length) lines.push(`- **Components**: ${f.components.map(c => c.name).join(', ')}`);
  if (f?.fixVersions?.length) lines.push(`- **Fix Versions**: ${f.fixVersions.map(v => v.name).join(', ')}`);
  if (f?.created) lines.push(`- **Created**: ${f.created}`);
  if (f?.updated) lines.push(`- **Updated**: ${f.updated}`);
  if (f?.project) lines.push(`- **Project**: ${f.project.name} (${f.project.key})`);
  if (f?.parent) lines.push(`- **Parent**: ${f.parent.key} - ${f.parent.fields?.summary ?? ''}`);
  if (f?.description) {
    lines.push('');
    lines.push('## Description');
    lines.push(f.description);
  }
  return lines.join('\n');
}

export function formatIssueList(issues: JiraIssue[], pagination: PaginationMeta): string {
  const lines: string[] = [];
  lines.push(`# Issues (${formatPaginationFooter(pagination)})`);
  lines.push('');
  for (const issue of issues) {
    const f = issue.fields;
    const status = f?.status?.name ?? '';
    const assignee = f?.assignee?.displayName ?? f?.assignee?.name ?? 'Unassigned';
    const priority = f?.priority?.name ?? '';
    lines.push(`- **${issue.key}**: ${f?.summary ?? ''} [${status}] (${priority}) — ${assignee}`);
  }
  return lines.join('\n');
}

export function formatProject(project: JiraProject): string {
  const lines: string[] = [];
  lines.push(`# ${project.name} (${project.key})`);
  lines.push('');
  if (project.description) lines.push(project.description);
  if (project.lead) lines.push(`- **Lead**: ${project.lead.displayName ?? project.lead.name}`);
  if (project.projectTypeKey) lines.push(`- **Type**: ${project.projectTypeKey}`);
  if (project.projectCategory) lines.push(`- **Category**: ${project.projectCategory.name}`);
  return lines.join('\n');
}

export function formatProjectList(projects: JiraProject[]): string {
  const lines = [`# Projects (${projects.length})\n`];
  for (const p of projects) {
    lines.push(`- **${p.key}**: ${p.name}${p.lead ? ` (Lead: ${p.lead.displayName ?? p.lead.name})` : ''}`);
  }
  return lines.join('\n');
}

export function formatUser(user: JiraUser): string {
  const lines: string[] = [];
  lines.push(`# ${user.displayName ?? user.name}`);
  if (user.name) lines.push(`- **Username**: ${user.name}`);
  if (user.emailAddress) lines.push(`- **Email**: ${user.emailAddress}`);
  if (user.active !== undefined) lines.push(`- **Active**: ${user.active}`);
  if (user.timeZone) lines.push(`- **Timezone**: ${user.timeZone}`);
  return lines.join('\n');
}

export function formatUserList(users: JiraUser[]): string {
  const lines = [`# Users (${users.length})\n`];
  for (const u of users) {
    lines.push(`- **${u.displayName ?? u.name}** (${u.name})${u.emailAddress ? ` — ${u.emailAddress}` : ''}`);
  }
  return lines.join('\n');
}

export function formatComment(comment: JiraComment): string {
  const author = comment.author?.displayName ?? comment.author?.name ?? 'Unknown';
  const lines = [`**${author}** (${comment.created ?? ''}):`];
  if (comment.body) lines.push(comment.body);
  if (comment.visibility) lines.push(`_Restricted to ${comment.visibility.type}: ${comment.visibility.value}_`);
  return lines.join('\n');
}

export function formatCommentList(comments: JiraComment[], pagination: PaginationMeta): string {
  const lines = [`# Comments (${formatPaginationFooter(pagination)})\n`];
  for (const c of comments) {
    lines.push(formatComment(c));
    lines.push('---');
  }
  return lines.join('\n');
}

export function formatWorklog(wl: JiraWorklog): string {
  const author = wl.author?.displayName ?? wl.author?.name ?? 'Unknown';
  return `- **${author}**: ${wl.timeSpent} on ${wl.started ?? ''}${wl.comment ? ` — ${wl.comment}` : ''}`;
}

export function formatWorklogList(worklogs: JiraWorklog[], pagination: PaginationMeta): string {
  const lines = [`# Worklogs (${formatPaginationFooter(pagination)})\n`];
  for (const wl of worklogs) {
    lines.push(formatWorklog(wl));
  }
  return lines.join('\n');
}

export function formatTransition(t: JiraTransition): string {
  return `- **${t.name}** (id: ${t.id}) → ${t.to?.name ?? ''}`;
}

export function formatTransitionList(transitions: JiraTransition[]): string {
  const lines = [`# Available Transitions (${transitions.length})\n`];
  for (const t of transitions) {
    lines.push(formatTransition(t));
  }
  return lines.join('\n');
}

export function formatBoard(board: JiraBoard): string {
  const lines: string[] = [];
  lines.push(`# ${board.name} (ID: ${board.id})`);
  if (board.type) lines.push(`- **Type**: ${board.type}`);
  if (board.location) {
    if (board.location.projectKey) lines.push(`- **Project**: ${board.location.projectName ?? ''} (${board.location.projectKey})`);
  }
  return lines.join('\n');
}

export function formatBoardList(boards: JiraBoard[], pagination: PaginationMeta): string {
  const lines = [`# Boards (${formatPaginationFooter(pagination)})\n`];
  for (const b of boards) {
    lines.push(`- **${b.name}** (ID: ${b.id}, Type: ${b.type ?? ''})`);
  }
  return lines.join('\n');
}

export function formatBoardConfig(config: JiraBoardConfiguration): string {
  const lines = [`# Board Configuration: ${config.name} (ID: ${config.id})\n`];
  if (config.filter) lines.push(`- **Filter ID**: ${config.filter.id}`);
  if (config.estimation) lines.push(`- **Estimation**: ${config.estimation.type} (${config.estimation.field?.displayName ?? ''})`);
  if (config.columnConfig?.columns) {
    lines.push('\n## Columns');
    for (const col of config.columnConfig.columns) {
      const statusCount = col.statuses?.length ?? 0;
      lines.push(`- **${col.name}** (${statusCount} statuses)`);
    }
  }
  return lines.join('\n');
}

export function formatSprint(sprint: JiraSprint): string {
  const lines: string[] = [];
  lines.push(`# ${sprint.name} (ID: ${sprint.id})`);
  if (sprint.state) lines.push(`- **State**: ${sprint.state}`);
  if (sprint.startDate) lines.push(`- **Start**: ${sprint.startDate}`);
  if (sprint.endDate) lines.push(`- **End**: ${sprint.endDate}`);
  if (sprint.completeDate) lines.push(`- **Completed**: ${sprint.completeDate}`);
  if (sprint.goal) lines.push(`- **Goal**: ${sprint.goal}`);
  return lines.join('\n');
}

export function formatSprintList(sprints: JiraSprint[], pagination: PaginationMeta): string {
  const lines = [`# Sprints (${formatPaginationFooter(pagination)})\n`];
  for (const s of sprints) {
    lines.push(`- **${s.name}** (ID: ${s.id}, State: ${s.state ?? ''})`);
  }
  return lines.join('\n');
}

export function formatEpic(epic: JiraEpic): string {
  const lines: string[] = [];
  lines.push(`# ${epic.name ?? epic.key} (${epic.key ?? `ID: ${epic.id}`})`);
  if (epic.summary) lines.push(`- **Summary**: ${epic.summary}`);
  if (epic.done !== undefined) lines.push(`- **Done**: ${epic.done}`);
  if (epic.color) lines.push(`- **Color**: ${epic.color.key}`);
  return lines.join('\n');
}

export function formatEpicList(epics: JiraEpic[], pagination: PaginationMeta): string {
  const lines = [`# Epics (${formatPaginationFooter(pagination)})\n`];
  for (const e of epics) {
    lines.push(`- **${e.name ?? e.key}** (${e.key ?? `ID: ${e.id}`})${e.done ? ' [Done]' : ''}`);
  }
  return lines.join('\n');
}

export function formatComponent(c: JiraComponent): string {
  const lines = [`# ${c.name} (ID: ${c.id})`];
  if (c.description) lines.push(`- **Description**: ${c.description}`);
  if (c.lead) lines.push(`- **Lead**: ${c.lead.displayName ?? c.lead.name}`);
  return lines.join('\n');
}

export function formatComponentList(components: JiraComponent[]): string {
  const lines = [`# Components (${components.length})\n`];
  for (const c of components) {
    lines.push(`- **${c.name}** (ID: ${c.id})${c.description ? ` — ${c.description}` : ''}`);
  }
  return lines.join('\n');
}

export function formatVersion(v: JiraVersion): string {
  const lines = [`# ${v.name} (ID: ${v.id})`];
  if (v.description) lines.push(`- **Description**: ${v.description}`);
  if (v.released !== undefined) lines.push(`- **Released**: ${v.released}`);
  if (v.archived !== undefined) lines.push(`- **Archived**: ${v.archived}`);
  if (v.releaseDate) lines.push(`- **Release Date**: ${v.releaseDate}`);
  if (v.startDate) lines.push(`- **Start Date**: ${v.startDate}`);
  return lines.join('\n');
}

export function formatVersionList(versions: JiraVersion[]): string {
  const lines = [`# Versions (${versions.length})\n`];
  for (const v of versions) {
    const status = v.released ? 'Released' : v.archived ? 'Archived' : 'Unreleased';
    lines.push(`- **${v.name}** (ID: ${v.id}) [${status}]${v.releaseDate ? ` — ${v.releaseDate}` : ''}`);
  }
  return lines.join('\n');
}

export function formatField(f: JiraField): string {
  return `- **${f.name}** (${f.id})${f.custom ? ' [custom]' : ' [system]'}${f.schema?.type ? ` — type: ${f.schema.type}` : ''}`;
}

export function formatFieldList(fields: JiraField[]): string {
  const lines = [`# Fields (${fields.length})\n`];
  for (const f of fields) {
    lines.push(formatField(f));
  }
  return lines.join('\n');
}

export function formatSimpleList<T extends { name?: string; id?: string; description?: string }>(
  title: string,
  items: T[]
): string {
  const lines = [`# ${title} (${items.length})\n`];
  for (const item of items) {
    lines.push(`- **${item.name}** (ID: ${item.id})${item.description ? ` — ${item.description}` : ''}`);
  }
  return lines.join('\n');
}

export function formatFilter(f: JiraFilter): string {
  const lines = [`# ${f.name} (ID: ${f.id})`];
  if (f.description) lines.push(`- **Description**: ${f.description}`);
  if (f.jql) lines.push(`- **JQL**: \`${f.jql}\``);
  if (f.owner) lines.push(`- **Owner**: ${f.owner.displayName ?? f.owner.name}`);
  if (f.viewUrl) lines.push(`- **View URL**: ${f.viewUrl}`);
  return lines.join('\n');
}

export function formatFilterList(filters: JiraFilter[]): string {
  const lines = [`# Filters (${filters.length})\n`];
  for (const f of filters) {
    lines.push(`- **${f.name}** (ID: ${f.id})${f.jql ? ` — \`${f.jql}\`` : ''}`);
  }
  return lines.join('\n');
}

export function formatDashboardList(dashboards: JiraDashboard[]): string {
  const lines = [`# Dashboards (${dashboards.length})\n`];
  for (const d of dashboards) {
    lines.push(`- **${d.name}** (ID: ${d.id})`);
  }
  return lines.join('\n');
}

export function formatAttachment(a: JiraAttachment): string {
  const lines = [`# ${a.filename} (ID: ${a.id})`];
  if (a.mimeType) lines.push(`- **Type**: ${a.mimeType}`);
  if (a.size) lines.push(`- **Size**: ${a.size} bytes`);
  if (a.author) lines.push(`- **Author**: ${a.author.displayName ?? a.author.name}`);
  if (a.created) lines.push(`- **Created**: ${a.created}`);
  if (a.content) lines.push(`- **URL**: ${a.content}`);
  return lines.join('\n');
}

export function formatRemoteLinkList(links: JiraRemoteLink[]): string {
  const lines = [`# Remote Links (${links.length})\n`];
  for (const l of links) {
    const title = l.object?.title ?? 'Untitled';
    const url = l.object?.url ?? '';
    lines.push(`- **${title}** — ${url}${l.relationship ? ` (${l.relationship})` : ''}`);
  }
  return lines.join('\n');
}

export function formatWatcherList(watchers: JiraUser[], watchCount: number): string {
  const lines = [`# Watchers (${watchCount})\n`];
  for (const w of watchers) {
    lines.push(`- ${w.displayName ?? w.name}`);
  }
  return lines.join('\n');
}
