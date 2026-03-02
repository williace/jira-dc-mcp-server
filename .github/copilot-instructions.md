# Copilot Instructions

## Project Overview

This is **jira-dc-mcp-server** — a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that exposes 66 tools for interacting with **Atlassian Jira Data Center** via its REST API v2 and Agile REST API v1.0. It is written in TypeScript and targets Node.js 18+.

## Tech Stack

- **Language**: TypeScript (strict mode, ES2022, Node16 module resolution)
- **Runtime**: Node.js 18+
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **HTTP client**: `axios` (Jira API calls)
- **HTTP server**: `express` (HTTP transport mode)
- **Schema validation**: `zod`
- **Testing**: `vitest` (unit, integration, e2e)
- **Container**: Docker (multi-stage Alpine image)

## Repository Structure

```
src/
├── index.ts          # Entry point — selects stdio or HTTP transport via TRANSPORT env var
├── server.ts         # McpServer factory — registers enabled tool groups
├── constants.ts      # API path constants, defaults, TOOL_GROUPS tuple
├── types.ts          # TypeScript interfaces for all Jira entities
├── schemas/
│   └── common.ts     # Shared Zod schemas (PaginationSchema, ResponseFormatSchema, etc.)
├── services/
│   ├── jira-client.ts  # Axios-based Jira HTTP client with PAT auth and error mapping
│   └── formatters.ts   # Markdown/JSON response formatting for every entity type
├── utils/
│   ├── errors.ts       # buildErrorResult helper
│   └── pagination.ts   # buildPaginationMeta helper
└── tools/
    ├── issues.ts       # 18 tools
    ├── projects.ts     # 13 tools
    ├── boards.ts       #  7 tools
    ├── sprints.ts      #  7 tools
    ├── epics.ts        #  5 tools
    ├── users.ts        #  3 tools
    ├── metadata.ts     # 10 tools
    └── attachments.ts  #  3 tools

tests/
├── setup.ts            # Vitest global setup
├── helpers/            # Shared test helpers and fixtures
├── unit/               # Unit tests (no I/O)
├── integration/        # Integration tests (mocked HTTP)
└── e2e/                # End-to-end tests (real Jira instance, optional)
```

## Development Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript → dist/
npm run dev          # Run via tsx (no build step)
npm test             # Run unit + integration tests
npm run test:watch   # Vitest watch mode
npm run test:coverage # Coverage report
npm run test:e2e     # E2E tests (requires real Jira instance)
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JIRA_BASE_URL` | Yes | — | Jira Data Center URL |
| `JIRA_PAT` | Yes | — | Personal Access Token |
| `TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `PORT` | No | `3000` | HTTP port (only with `http` transport) |
| `ENABLED_TOOL_GROUPS` | No | all | Comma-separated tool group names |

## Coding Conventions

### Adding a new tool

1. Pick the correct tool file in `src/tools/` (or create a new one for a new domain).
2. Call `server.registerTool(name, { title, description, inputSchema }, handler)` inside the `register*Tools` function.
3. Use **Zod** schemas from `src/schemas/common.ts` for shared fields (pagination, response format, issue ID/key, etc.).
4. Retrieve the Jira client with `getJiraClient()` from `src/services/jira-client.ts`.
5. Format responses with helpers from `src/services/formatters.ts` — `formatToolResponse(data, format)` is the standard return.
6. Wrap errors with `buildErrorResult(error)` from `src/utils/errors.ts`.
7. Add API path constants to `src/constants.ts` instead of inlining URL strings.

### Adding a new tool group

1. Add the group name to the `TOOL_GROUPS` tuple in `src/constants.ts`.
2. Create `src/tools/<group>.ts` with a `register<Group>Tools(server: McpServer): void` export.
3. Import and register it in `src/server.ts` (`TOOL_REGISTRARS` map).

### Tool description format

Tool descriptions follow a consistent JSDoc-style pattern:

```
Short one-line summary.

Args:
  - paramName (type, required|optional): Description

Returns: What the tool returns.

Examples:
  - Example call

Error handling:
  - HTTP status: Explanation
```

### Response format

Every tool accepts an optional `format` parameter (`"markdown"` | `"json"`, default `"markdown"`). Always pass it through to `formatToolResponse`.

### Testing

- Unit tests go in `tests/unit/`, integration tests in `tests/integration/`.
- Mock the Jira HTTP client (`src/services/jira-client.ts`) using Vitest mocks — do **not** call a real Jira instance in unit/integration tests.
- Use helpers from `tests/helpers/` for common fixtures and setup.
- Match existing test file naming: `<source-file>.test.ts`.

### TypeScript

- Strict mode is enabled — no implicit `any`.
- Use `.js` extensions in imports (Node16 ESM resolution), e.g., `import { foo } from './bar.js'`.
- Add new entity interfaces to `src/types.ts`.

## Security Notes

- **Never commit secrets** — use `.env` (gitignored) for local development.
- GitHub Actions workflows are pinned to commit SHAs.
- CodeQL SAST runs on every push and PR.
- Trivy scans the Docker image for CVEs.
- Dependabot is configured for npm, Actions, and Docker.
