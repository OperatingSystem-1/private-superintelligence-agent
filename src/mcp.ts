// stdio bridge to the remote MCP server, for clients that only launch local
// servers. Each JSON-RPC line on stdin is POSTed to the Streamable HTTP
// endpoint; each reply goes to stdout as one line.
import { createInterface } from 'node:readline';

export const MCP_URL = 'https://privatesuperintelligence.si/mcp';

export async function runStdioBridge(url = MCP_URL, input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout) {
  const lines = createInterface({ input, crlfDelay: Infinity });
  let protocolVersion: string | undefined;
  const pending: Promise<void>[] = [];
  for await (const line of lines) {
    if (!line.trim()) continue;
    pending.push((async () => {
      let id: unknown = null;
      try { id = (JSON.parse(line) as { id?: unknown }).id ?? null; } catch { /* reported by the server */ }
      try {
        const response = await fetch(url, { method: 'POST', body: line, headers: {
          'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
          ...(protocolVersion ? { 'Mcp-Protocol-Version': protocolVersion } : {}) } });
        protocolVersion = response.headers.get('mcp-protocol-version') ?? protocolVersion;
        if (response.status === 202) return;
        const text = await response.text();
        if (text) output.write(`${text.replace(/\n/g, '')}\n`);
      } catch (error) {
        if (id !== null) output.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32603, message: `Could not reach ${url}: ${(error as Error).message}` } })}\n`);
      }
    })());
  }
  await Promise.all(pending);
}
