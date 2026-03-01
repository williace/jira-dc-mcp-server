#!/usr/bin/env node
/**
 * Entry point for the Jira Data Center MCP server.
 *
 * Supports two transport modes controlled by the TRANSPORT env var:
 *   - "stdio"  (default) — communicates over stdin/stdout, used by Claude Desktop
 *   - "http"             — runs an Express server with a /mcp POST endpoint,
 *                          used for Docker deployments and remote MCP clients
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createServer } from './server.js';

/** Launch the MCP server over stdin/stdout (for local CLI integrations). */
async function startStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira DC MCP Server running on stdio');
}

/**
 * Launch the MCP server over HTTP (for Docker / remote deployments).
 *
 * Each POST to /mcp creates a fresh stateless transport — no sessions are
 * maintained between requests, which makes horizontal scaling straightforward.
 */
async function startHttp(): Promise<void> {
  const server = createServer();
  const app = express();
  const port = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // Stateless MCP endpoint — each request gets its own transport instance
  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless: no session tracking
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Simple health check for container orchestration (Docker, K8s)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: 'jira-dc-mcp-server' });
  });

  app.listen(port, () => {
    console.error(`Jira DC MCP Server running on http://localhost:${port}/mcp`);
  });
}

// Select transport based on TRANSPORT env var, defaulting to stdio
const transport = process.env.TRANSPORT || 'stdio';

if (transport === 'http') {
  startHttp().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
} else if (transport === 'stdio') {
  startStdio().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
} else {
  console.error(`Unknown TRANSPORT: ${transport}. Use "stdio" or "http".`);
  process.exit(1);
}
