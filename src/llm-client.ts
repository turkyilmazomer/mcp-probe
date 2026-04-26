import type { McpTool } from './mcp-client.js';

export class LlmClient {
  constructor(
    private readonly url: string,
    private readonly model: string,
    private readonly key?: string,
  ) {}

  async chat(system: string, user: string, temperature = 0.7): Promise<string> {
    const doc = await this.post({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
    });
    return (doc.choices as { message: { content: string } }[])[0].message.content ?? '';
  }

  async chatWithTools(
    userPrompt: string,
    tools: McpTool[],
  ): Promise<{ tool: string | null; args: unknown }> {
    const openaiTools = tools.map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.inputSchema },
    }));

    const doc = await this.post({
      model: this.model,
      messages: [{ role: 'user', content: userPrompt }],
      tools: openaiTools,
      tool_choice: 'auto',
      temperature: 0,
    });

    type ToolCall = { function: { name: string; arguments: string } };
    const msg = (doc.choices as { message: { tool_calls?: ToolCall[] } }[])[0].message;
    if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const fn = msg.tool_calls[0].function;
      let args: unknown = {};
      try { args = JSON.parse(fn.arguments ?? '{}'); } catch { /* ignore */ }
      return { tool: fn.name, args };
    }
    return { tool: null, args: {} };
  }

  private async post(body: unknown): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.key) headers['Authorization'] = `Bearer ${this.key}`;

    let delayMs = 2000;
    for (let attempt = 0; ; attempt++) {
      const resp = await fetch(`${this.url.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      if (resp.status === 429 && attempt < 8) {
        await new Promise(r => setTimeout(r, delayMs));
        delayMs = Math.min(delayMs * 2, 30_000);
        continue;
      }
      if (!resp.ok) throw new Error(`LLM HTTP ${resp.status}: ${text}`);
      return JSON.parse(text) as Record<string, unknown>;
    }
  }
}
