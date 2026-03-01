/**
 * Automates the Jira DC first-run setup wizard via form POSTs.
 * This is fragile and tied to the pinned Jira version (9.17).
 * The wizard steps: setup mode → database → app properties → license → admin account → email.
 */
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

const BASE = process.env.JIRA_BASE_URL ?? 'http://localhost:8080';
const LICENSE = process.env.JIRA_LICENSE_KEY;
const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = process.env.DB_PORT ?? '5432';

if (!LICENSE) {
  console.error('JIRA_LICENSE_KEY env var is required');
  process.exit(1);
}

let cookies: string[] = [];

function extractCookies(res: AxiosResponse): void {
  const setCookie = res.headers['set-cookie'];
  if (setCookie) {
    cookies = [...cookies, ...setCookie.map((c: string) => c.split(';')[0])];
  }
}

const client: AxiosInstance = axios.create({
  baseURL: BASE,
  maxRedirects: 5,
  validateStatus: () => true, // don't throw on 3xx/4xx
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
});

// Attach cookies to every request
client.interceptors.request.use(config => {
  if (cookies.length) {
    config.headers.Cookie = cookies.join('; ');
  }
  return config;
});

client.interceptors.response.use(res => {
  extractCookies(res);
  return res;
});

async function step1_setupMode(): Promise<void> {
  await client.get('/secure/SetupMode!default.jspa');
  await client.post('/secure/SetupMode.jspa', 'setupOption=classic');
  console.log('Step 1/6: Setup mode → classic');
}

async function step2_database(): Promise<void> {
  // Database is pre-configured via environment variables.
  // POST to confirm the external database configuration.
  await client.post('/secure/SetupDatabase.jspa',
    'databaseOption=external&' +
    'databaseType=postgres72&' +
    `jdbcHostname=${DB_HOST}&` +
    `jdbcPort=${DB_PORT}&` +
    'jdbcDatabase=jiradb&' +
    'jdbcUsername=jira&' +
    'jdbcPassword=jira'
  );
  console.log('Step 2/6: Database configured');
}

async function step3_applicationProperties(): Promise<void> {
  const params = new URLSearchParams({
    title: 'Jira E2E Test',
    mode: 'private',
    baseURL: BASE,
  });
  await client.post('/secure/SetupApplicationProperties.jspa', params.toString());
  console.log('Step 3/6: Application properties set');
}

async function step4_license(): Promise<void> {
  const params = new URLSearchParams({
    setupLicenseKey: LICENSE!,
  });
  await client.post('/secure/SetupLicense.jspa', params.toString());
  console.log('Step 4/6: License applied');
}

async function step5_adminAccount(): Promise<void> {
  const params = new URLSearchParams({
    username: 'admin',
    fullname: 'Admin User',
    email: 'admin@test.local',
    password: 'admin',
    confirm: 'admin',
  });
  await client.post('/secure/SetupAdminAccount.jspa', params.toString());
  console.log('Step 5/6: Admin account created');
}

async function step6_emailNotifications(): Promise<void> {
  await client.post('/secure/SetupMailNotifications.jspa', 'noemail=true');
  console.log('Step 6/6: Email notifications skipped');
}

async function run(): Promise<void> {
  console.log(`Automating Jira setup wizard at ${BASE}...`);
  await step1_setupMode();
  await step2_database();
  await step3_applicationProperties();
  await step4_license();
  await step5_adminAccount();
  await step6_emailNotifications();
  console.log('Setup wizard completed successfully!');
}

run().catch(err => {
  console.error('Setup wizard failed:', err.message);
  process.exit(1);
});
