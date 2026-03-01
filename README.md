# Jira Data Center MCP Server

An MCP (Model Context Protocol) server that enables AI agents to interact with **Atlassian Jira Data Center** through 66 tools covering issues, projects, boards, sprints, epics, users, metadata, and attachments.

Built for enterprise Jira Data Center deployments using the REST API v2 and Agile REST API v1.0.

## Features

- **66 tools** across 8 domain groups for comprehensive Jira coverage
- **Dual transport** — stdio for local MCP hosts, Streamable HTTP for remote/containerized deployments
- **Personal Access Token (PAT)** authentication
- **Selective tool loading** — enable only the tool groups you need via `ENABLED_TOOL_GROUPS`
- **Dual response format** — Markdown (human-readable) or JSON (structured) per request
- **Pagination support** — consistent `startAt`/`maxResults` across all list operations
- **Docker-ready** — multi-stage Alpine image, available on GitHub Container Registry

## Tools

| Group | Tools | Description |
|---|---|---|
| **issues** | 18 | CRUD, JQL search, transitions, comments, worklogs, watchers, remote links, ranking |
| **projects** | 13 | Projects, components CRUD, versions CRUD, statuses |
| **boards** | 7 | List/get boards, configuration, issues, backlog, sprints, epics (Agile API) |
| **sprints** | 7 | CRUD, sprint issues, move issues to sprint/backlog (Agile API) |
| **epics** | 5 | Get/update epics, epic issues, move to/from epic (Agile API) |
| **users** | 3 | Get user, search users, get current user |
| **metadata** | 10 | Fields, priorities, statuses, issue types, resolutions, filters, dashboards |
| **attachments** | 3 | Get, delete, upload (base64) |

<details>
<summary>Full tool list (66 tools)</summary>

**Issues**: `jira_create_issue`, `jira_get_issue`, `jira_update_issue`, `jira_delete_issue`, `jira_search_issues`, `jira_get_transitions`, `jira_transition_issue`, `jira_add_comment`, `jira_get_comments`, `jira_update_comment`, `jira_delete_comment`, `jira_add_worklog`, `jira_get_worklogs`, `jira_add_watcher`, `jira_get_watchers`, `jira_add_remote_link`, `jira_get_remote_links`, `jira_rank_issues`

**Projects**: `jira_list_projects`, `jira_get_project`, `jira_get_project_versions`, `jira_get_project_components`, `jira_get_project_statuses`, `jira_create_component`, `jira_get_component`, `jira_update_component`, `jira_delete_component`, `jira_create_version`, `jira_get_version`, `jira_update_version`, `jira_delete_version`

**Boards**: `jira_list_boards`, `jira_get_board`, `jira_get_board_configuration`, `jira_get_board_issues`, `jira_get_board_backlog`, `jira_get_board_sprints`, `jira_get_board_epics`

**Sprints**: `jira_create_sprint`, `jira_get_sprint`, `jira_update_sprint`, `jira_delete_sprint`, `jira_get_sprint_issues`, `jira_move_issues_to_sprint`, `jira_move_issues_to_backlog`

**Epics**: `jira_get_epic`, `jira_update_epic`, `jira_get_epic_issues`, `jira_move_issues_to_epic`, `jira_remove_issues_from_epic`

**Users**: `jira_get_user`, `jira_search_users`, `jira_get_myself`

**Metadata**: `jira_list_fields`, `jira_create_custom_field`, `jira_list_priorities`, `jira_list_statuses`, `jira_list_issue_types`, `jira_list_resolutions`, `jira_create_filter`, `jira_get_filter`, `jira_get_favourite_filters`, `jira_list_dashboards`

**Attachments**: `jira_get_attachment`, `jira_delete_attachment`, `jira_add_attachment`

</details>

## Quick Start

### Prerequisites

- Node.js 18+
- A Jira Data Center instance with a [Personal Access Token](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html)

### Install and build

```bash
git clone https://github.com/williace/jira-dc-mcp-server.git
cd jira-dc-mcp-server
npm install
npm run build
```

### Configure

```bash
cp .env.example .env
```

Edit `.env`:

```env
JIRA_BASE_URL=https://jira.company.com
JIRA_PAT=your-personal-access-token
TRANSPORT=stdio
```

### Run

```bash
# stdio mode (for Claude Desktop, Cursor, etc.)
npm run start:stdio

# HTTP mode (for remote/containerized deployments)
npm run start:http
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `JIRA_BASE_URL` | Yes | — | Your Jira Data Center URL (e.g., `https://jira.company.com`) |
| `JIRA_PAT` | Yes | — | Personal Access Token for authentication |
| `TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `http` |
| `PORT` | No | `3000` | HTTP server port (only used with `TRANSPORT=http`) |
| `ENABLED_TOOL_GROUPS` | No | all | Comma-separated list of tool groups to enable (e.g., `issues,projects,boards`) |

### Selective tool loading

If your MCP host has a tool limit or you only need specific functionality, use `ENABLED_TOOL_GROUPS`:

```env
ENABLED_TOOL_GROUPS=issues,projects,boards
```

Available groups: `issues`, `projects`, `users`, `boards`, `sprints`, `epics`, `metadata`, `attachments`

## MCP Host Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-dc-mcp-server/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://jira.company.com",
        "JIRA_PAT": "your-personal-access-token"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add jira -- node /path/to/jira-dc-mcp-server/dist/index.js \
  --env JIRA_BASE_URL=https://jira.company.com \
  --env JIRA_PAT=your-personal-access-token
```

### HTTP mode (remote)

Start the server:

```bash
TRANSPORT=http JIRA_BASE_URL=https://jira.company.com JIRA_PAT=your-pat node dist/index.js
```

The MCP endpoint is available at `http://localhost:3000/mcp` with a health check at `/health`.

## Docker

### Pull from GitHub Container Registry

```bash
docker pull ghcr.io/williace/jira-dc-mcp-server:latest
```

### Run

```bash
docker run -p 3000:3000 \
  -e JIRA_BASE_URL=https://jira.company.com \
  -e JIRA_PAT=your-personal-access-token \
  ghcr.io/williace/jira-dc-mcp-server:latest
```

### Build locally

```bash
docker build -t jira-dc-mcp-server .
```

## Project Structure

```
src/
├── index.ts              # Entry point — transport selection (stdio/HTTP)
├── server.ts             # MCP server creation and tool group registration
├── constants.ts          # API paths, defaults, tool group definitions
├── types.ts              # TypeScript interfaces for Jira entities
├── schemas/
│   └── common.ts         # Shared Zod schemas (pagination, response format, IDs)
├── services/
│   ├── jira-client.ts    # Axios-based HTTP client with PAT auth and error mapping
│   └── formatters.ts     # Markdown/JSON response formatting for all entities
├── utils/
│   ├── errors.ts         # Error handling utilities
│   └── pagination.ts     # Pagination metadata helpers
└── tools/
    ├── issues.ts         # 18 tools — CRUD, search, transitions, comments, worklogs
    ├── projects.ts       # 13 tools — projects, components, versions
    ├── boards.ts         #  7 tools — boards, configuration, backlog (Agile API)
    ├── sprints.ts        #  7 tools — sprint management (Agile API)
    ├── epics.ts          #  5 tools — epic management (Agile API)
    ├── users.ts          #  3 tools — user lookup and search
    ├── metadata.ts       # 10 tools — fields, statuses, filters, dashboards
    └── attachments.ts    #  3 tools — attachment get, delete, upload
```

## API Coverage

This server targets the **Jira Data Center** REST APIs:

- **Core REST API v2** (`/rest/api/2/`) — issues, projects, users, fields, filters, etc.
- **Agile REST API v1.0** (`/rest/agile/1.0/`) — boards, sprints, epics, ranking

> **Note**: This server is built for Jira Data Center (on-premises / self-hosted). It is not designed for Jira Cloud, which uses different API endpoints and authentication mechanisms.

## Security

This repository uses GitHub security best practices:

- **GitHub Actions pinned to commit SHAs** to prevent supply-chain attacks
- **Least-privilege permissions** on all workflow jobs
- **CodeQL** static analysis (SAST) on every push and PR
- **Trivy** container image scanning for OS and library vulnerabilities
- **OSSF Scorecard** for supply-chain security scoring
- **Dependabot** for automated dependency updates (npm, Actions, Docker)
- **Dependency review** on pull requests to flag risky new dependencies
- **Branch protection** on `main` requiring passing checks and PR review

## License

MIT
