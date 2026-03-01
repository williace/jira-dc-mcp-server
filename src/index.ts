#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createServer } from './server.js';

async function startStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira DC MCP Server running on stdio');
}

async function startHttp(): Promise<void> {
  const server = createServer();
  const app = express();
  const port = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: 'jira-dc-mcp-server' });
  });

  app.listen(port, () => {
    console.error(`Jira DC MCP Server running on http://localhost:${port}/mcp`);
  });
}

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
