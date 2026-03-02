/**
 * Automates the Jira DC first-run setup wizard via form POSTs.
 * This is fragile and tied to the pinned Jira version (9.17).
 *
 * Steps 1 (setup mode) and 2 (database) are auto-configured by the Docker image's
 * ATL_JDBC_* environment variables, so we start at step 3 (application properties).
 *
 * XSRF protection: Jira sets an `atlassian.xsrf.token` cookie. POSTs must include
 * the cookie value as an `atl_token` form parameter.
 */
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

const BASE = process.env.JIRA_BASE_URL ?? 'http://localhost:8080';
const LICENSE = process.env.JIRA_LICENSE_KEY;

if (!LICENSE) {
  console.error('JIRA_LICENSE_KEY env var is required');
  process.exit(1);
}

// ── Cookie jar ──────────────────────────────────────────────────────────────

const cookieJar = new Map<string, string>();

function captureCookies(res: AxiosResponse): void {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return;
  for (const raw of setCookie) {
    const pair = raw.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader(): string {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function xsrfToken(): string {
  return cookieJar.get('atlassian.xsrf.token') ?? '';
}

// ── Axios client ────────────────────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: BASE,
  maxRedirects: 5,
  validateStatus: () => true,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  timeout: 120_000,
});

client.interceptors.request.use(config => {
  const c = cookieHeader();
  if (c) config.headers.Cookie = c;
  return config;
});

client.interceptors.response.use(res => {
  captureCookies(res);
  return res;
});

// Extract atl_token from HTML as a fallback
function extractAtlTokenFromHtml(html: string): string | null {
  const inputMatch = html.match(/name="atl_token"\s+value="([^"]+)"/);
  if (inputMatch) return inputMatch[1];
  const metaMatch = html.match(/id="atlassian-token"[^>]*content="([^"]+)"/);
  if (metaMatch) return metaMatch[1];
  return null;
}

async function getTokenForStep(url: string): Promise<string> {
  const res = await client.get(url);
  // Try HTML hidden field first
  if (typeof res.data === 'string') {
    const htmlToken = extractAtlTokenFromHtml(res.data);
    if (htmlToken) return htmlToken;
  }
  // Fall back to cookie-based XSRF token
  return xsrfToken();
}

function logStep(step: string, status: number, res: AxiosResponse): void {
  const ok = status < 400;
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} ${step} (HTTP ${status})`);
  if (!ok) {
    if (typeof res.data === 'string') {
      const titleMatch = res.data.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) console.log(`    Page title: ${titleMatch[1].trim()}`);
      // Check for error messages in the page
      const errorMatch = res.data.match(/class="errMsg"[^>]*>([^<]+)</);
      if (errorMatch) console.log(`    Error: ${errorMatch[1].trim()}`);
    }
    throw new Error(`${step} failed with HTTP ${status}`);
  }
}

// ── Wizard steps ────────────────────────────────────────────────────────────
// Steps 1 & 2 (setup mode + database) are handled by Docker ATL_JDBC_* env vars.
// We prime cookies by visiting the setup page, then start at step 3.

async function primeCookies(): Promise<void> {
  // Visit the setup entry point to get session + XSRF cookies.
  // This will redirect through SetupMode → SetupDatabase → SetupApplicationProperties
  // since steps 1-2 are auto-configured.
  await client.get('/secure/SetupMode!default.jspa');
  console.log(`  XSRF token acquired: ${xsrfToken() ? 'yes' : 'no'}`);
}

async function step3_applicationProperties(): Promise<void> {
  const token = await getTokenForStep('/secure/SetupApplicationProperties!default.jspa');
  const params = new URLSearchParams({
    title: 'Jira E2E Test',
    mode: 'private',
    baseURL: BASE,
  });
  if (token) params.set('atl_token', token);
  const res = await client.post('/secure/SetupApplicationProperties.jspa', params.toString());
  logStep('Step 3/6: Application properties set', res.status, res);
}

async function step4_license(): Promise<void> {
  const token = await getTokenForStep('/secure/SetupLicense!default.jspa');
  const params = new URLSearchParams({ setupLicenseKey: LICENSE! });
  if (token) params.set('atl_token', token);
  const res = await client.post('/secure/SetupLicense.jspa', params.toString());
  logStep('Step 4/6: License applied', res.status, res);
}

async function step5_adminAccount(): Promise<void> {
  const token = await getTokenForStep('/secure/SetupAdminAccount!default.jspa');
  const params = new URLSearchParams({
    username: 'admin',
    fullname: 'Admin User',
    email: 'admin@test.local',
    password: 'admin',
    confirm: 'admin',
  });
  if (token) params.set('atl_token', token);
  const res = await client.post('/secure/SetupAdminAccount.jspa', params.toString());
  logStep('Step 5/6: Admin account created', res.status, res);
}

async function step6_emailNotifications(): Promise<void> {
  const token = await getTokenForStep('/secure/SetupMailNotifications!default.jspa');
  const params = new URLSearchParams({ noemail: 'true' });
  if (token) params.set('atl_token', token);
  const res = await client.post('/secure/SetupMailNotifications.jspa', params.toString());
  logStep('Step 6/6: Email notifications skipped', res.status, res);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log(`Automating Jira setup wizard at ${BASE}...`);

  await primeCookies();
  await step3_applicationProperties();
  await step4_license();
  await step5_adminAccount();
  await step6_emailNotifications();

  // Verify Jira is now set up by checking /status
  const status = await client.get('/status');
  const state = status.data?.state;
  console.log(`\nJira status after setup: ${state}`);
  if (state === 'RUNNING') {
    console.log('Setup wizard completed successfully!');
  } else {
    const message = `Expected RUNNING state but got ${state}`;
    console.error(message);
    throw new Error(message);
  }
}

run().catch(err => {
  console.error('Setup wizard failed:', err.message);
  process.exit(1);
});
