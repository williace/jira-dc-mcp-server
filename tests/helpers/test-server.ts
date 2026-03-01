import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

/**
 * Creates an McpServer with the given tool registrar, connects it via
 * InMemoryTransport, and returns a Client ready to call tools.
 */
export async function createTestClient(
  registerFn: (server: McpServer) => void
): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const server = new McpServer({ name: 'test-server', version: '0.0.1' });
  registerFn(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.1' });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return {
    client,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}
