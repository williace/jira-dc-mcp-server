# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue.
2. Use [GitHub private vulnerability reporting](https://github.com/williace/jira-dc-mcp-server/security/advisories/new) to submit details.
3. Include steps to reproduce, impact assessment, and any suggested fixes.

You can expect an initial response within 72 hours. Critical vulnerabilities will be prioritized for patching.

## Security Measures

This project uses the following automated security tooling:

- **CodeQL** — static analysis on every push and PR
- **OSSF Scorecard** — supply-chain security scoring
- **Trivy** — container image vulnerability scanning
- **Dependabot** — automated dependency updates
- **Dependency Review** — PR-level dependency audit
- **SHA-pinned Actions** — all GitHub Actions are pinned by commit hash
