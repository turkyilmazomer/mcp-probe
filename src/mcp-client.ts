export interface McpTool {
  name: string;
  description: string;
  inputSchema: unknown;
}

export class McpClient {
  private sessionId?: string;
  private reqId = 0;

  constructor(private readonly url: string) {}

  async initialize(): Promise<void> {
    await this.sendRpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'mcp-eval', version: '0.1' },
    });
    await this.sendNotification('notifications/initialized');
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.sendRpc('tools/list', {});
    if (!Array.isArray(result?.tools)) return [];
    return result.tools.map((t: Record<string, unknown>) => ({
      name: t['name'] as string,
      description: (t['description'] as string | undefined) ?? '',
      inputSchema: t['inputSchema'],
    }));
  }

  private async sendRpc(method: string, params: unknown): Promise<Record<string, unknown>> {
    const body = { jsonrpc: '2.0', id: ++this.reqId, method, params };
    const resp = await this.post(body);
    const json = await this.readBody(resp);
    const parsed = JSON.parse(json) as { error?: unknown; result: Record<string, unknown> };
    if (parsed.error) throw new Error(`MCP error from ${method}: ${JSON.stringify(parsed.error)}`);
    return parsed.result;
  }

  private async sendNotification(method: string): Promise<void> {
    await this.post({ jsonrpc: '2.0', method, params: {} });
  }

  private async post(body: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    const resp = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const sid = resp.headers.get('Mcp-Session-Id');
    if (sid) this.sessionId = sid;
    return resp;
  }

  private async readBody(resp: Response): Promise<string> {
    const ct = resp.headers.get('Content-Type') ?? '';
    const text = await resp.text();
    if (!ct.includes('event-stream')) return text;

    const parts: string[] = [];
    for (const raw of text.split('\n')) {
      const line = raw.trimEnd();
      if (line.startsWith('data:')) {
        parts.push(line.slice(5).trimStart());
      } else if (line.length === 0 && parts.length > 0) {
        break;
      }
    }
    return parts.join('');
  }
}
