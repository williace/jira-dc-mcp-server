/**
 * Seeds a fresh Jira DC instance with test data via REST API.
 * Creates a Scrum project, issues, comments, board, and sprint.
 * Writes seed data manifest to GITHUB_ENV for consumption by e2e tests.
 */
import axios from 'axios';
import { appendFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const BASE = process.env.JIRA_BASE_URL ?? 'http://localhost:8080';

const client = axios.create({
  baseURL: BASE,
  headers: {
    'Authorization': `Basic ${Buffer.from('admin:admin').toString('base64')}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

interface SeedResult {
  projectKey: string;
  issueKeys: string[];
  boardId: number;
  sprintId: number;
}

async function seedTestData(): Promise<SeedResult> {
  console.log('Seeding test data...');

  // 1. Create a Scrum project
  const project = await client.post('/rest/api/2/project', {
    key: 'TEST',
    name: 'E2E Test Project',
    projectTypeKey: 'software',
    projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-scrum-template',
    lead: 'admin',
  });
  console.log(`Created project: ${project.data.key}`);

  // 2. Create issues
  const issueDefs = [
    { summary: 'E2E Test Bug', issuetype: { name: 'Bug' }, priority: { name: 'High' } },
    { summary: 'E2E Test Story', issuetype: { name: 'Story' }, priority: { name: 'Medium' } },
    { summary: 'E2E Test Task', issuetype: { name: 'Task' }, priority: { name: 'Low' } },
  ];

  const issueKeys: string[] = [];
  for (const def of issueDefs) {
    const issue = await client.post('/rest/api/2/issue', {
      fields: {
        project: { key: 'TEST' },
        summary: def.summary,
        issuetype: def.issuetype,
        priority: def.priority,
        description: `Automated test issue: ${def.summary}`,
      },
    });
    issueKeys.push(issue.data.key);
    console.log(`Created issue: ${issue.data.key}`);
  }

  // 3. Add a comment to the first issue
  await client.post(`/rest/api/2/issue/${issueKeys[0]}/comment`, {
    body: 'This is a test comment for e2e testing.',
  });
  console.log(`Added comment to ${issueKeys[0]}`);

  // 4. Find the auto-created board (Scrum template creates one)
  const boards = await client.get('/rest/agile/1.0/board', {
    params: { projectKeyOrId: 'TEST' },
  });
  const boardId = boards.data.values[0]?.id;
  console.log(`Found board: ${boardId}`);

  // 5. Create a sprint
  const sprint = await client.post('/rest/agile/1.0/sprint', {
    name: 'E2E Test Sprint',
    originBoardId: boardId,
    goal: 'Automated e2e test sprint',
  });
  const sprintId = sprint.data.id;
  console.log(`Created sprint: ${sprintId}`);

  // 6. Move issues into the sprint
  await client.post(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
    issues: issueKeys,
  });
  console.log(`Moved ${issueKeys.length} issues to sprint ${sprintId}`);

  const manifest: SeedResult = { projectKey: 'TEST', issueKeys, boardId, sprintId };

  // Determine auth token (PAT preferred, Basic auth fallback)
  let jiraPat: string;
  try {
    const pat = await client.post('/rest/pat/latest/tokens', {
      name: 'e2e-test-token',
      expirationDuration: 1,
    });
    jiraPat = pat.data.rawToken;
    console.log('Created PAT for e2e tests');
  } catch {
    // PAT creation not supported; use Basic Auth via BASIC: prefix
    jiraPat = `BASIC:${Buffer.from('admin:admin').toString('base64')}`;
    console.warn('PAT creation not supported; e2e tests will use Basic Auth');
  }

  const envLines = [
    `E2E_SEED_DATA=${JSON.stringify(manifest)}`,
    `JIRA_PAT=${jiraPat}`,
  ];

  // Write to GITHUB_ENV in CI, or to a local .env.e2e file otherwise
  const ghEnvFile = process.env.GITHUB_ENV;
  if (ghEnvFile) {
    appendFileSync(ghEnvFile, envLines.map(l => l + '\n').join(''));
  } else {
    const localEnvPath = fileURLToPath(new URL('../.env.e2e', import.meta.url));
    writeFileSync(localEnvPath, envLines.join('\n') + '\n', { mode: 0o600 });
    console.log(`Wrote env file: ${localEnvPath}`);
  }

  console.log('Seed data:', JSON.stringify(manifest, null, 2));
  return manifest;
}

seedTestData().catch(err => {
  console.error('Seed failed:', err.response?.data ?? err.message);
  process.exit(1);
});
