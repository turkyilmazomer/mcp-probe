import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { McpClient, type McpTool } from './mcp-client.js';
import { LlmClient } from './llm-client.js';

interface ToolEntry   { name: string; description: string; inputSchema: unknown }
interface TestPrompt  { category: string; prompt: string; expected_args?: unknown }
interface RunResult   { tool: string; category: string; prompt: string; actual_tool: string | null; error?: string }

const DATA = 'data';
mkdirSync(join(DATA, 'tests'), { recursive: true });
mkdirSync(join(DATA, 'runs'),  { recursive: true });

const argv = process.argv.slice(2);
const cmd  = argv[0];

const arg = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
};

const mcpUrl  = () => arg('--mcp') ?? process.env['MCP_URL'] ?? bail('Need --mcp <url> or MCP_URL env var');
const makeLlm = () => new LlmClient(
  process.env['LLM_URL']   ?? bail('LLM_URL env required'),
  process.env['LLM_MODEL'] ?? bail('LLM_MODEL env required'),
  process.env['LLM_KEY'],
);

function bail(msg: string): never { throw new Error(msg); }

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k) ?? [];
    arr.push(item);
    map.set(k, arr);
  }
  return map;
}

try {
  switch (cmd) {
    case 'discover': await discover(); break;
    case 'generate': await generate(Number(arg('--n') ?? '3')); break;
    case 'run':      await run(); break;
    case 'score':    await score(); break;
    default:
      console.log('Usage:');
      console.log('  npx tsx src/index.ts discover --mcp <url>');
      console.log('  npx tsx src/index.ts generate [--n 3]');
      console.log('  npx tsx src/index.ts run --mcp <url>');
      console.log('  npx tsx src/index.ts score');
      console.log();
      console.log('Env vars: LLM_URL, LLM_MODEL, LLM_KEY (optional), MCP_URL');
  }
} catch (e) {
  console.error('ERROR:', e instanceof Error ? e.message : e);
  process.exit(1);
}

// ──────────────── commands ────────────────

async function discover() {
  const mcp = new McpClient(mcpUrl());
  await mcp.initialize();
  const tools = await mcp.listTools();

  console.log(`Found ${tools.length} tools:`);
  for (const t of tools) console.log(`  - ${t.name}`);

  const out = tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
  await writeFile(join(DATA, 'tools.json'), JSON.stringify(out, null, 2));
  console.log(`→ ${DATA}/tools.json`);
}

async function generate(n: number) {
  const llm   = makeLlm();
  const tools = JSON.parse(await readFile(join(DATA, 'tools.json'), 'utf8')) as ToolEntry[];

  const sys = 'You generate test prompts for evaluating MCP tool selection. Output ONLY a valid JSON array. No prose, no markdown fences.';

  for (const t of tools) {
    process.stdout.write(`Generating prompts for ${t.name}... `);

    const user = `Tool: ${t.name}
Description: ${t.description}
Input schema: ${JSON.stringify(t.inputSchema)}

Generate ${n} prompts per category. Categories:
- direct: clear, explicit intent matching this tool
- indirect: user describes a situation; the right tool must be inferred
- adversarial: ambiguous wording that might also match a similar tool

Use realistic phrasings. Mix Turkish and English where natural.
Output exactly this JSON shape:
[
  {"category":"direct","prompt":"...","expected_args":{}},
  ...
]
expected_args: a plausible argument object for a correct call (use placeholder values when needed). Empty object {} if no args needed.`;

    let output = (await llm.chat(sys, user, 0.8)).trim();

    if (output.startsWith('```')) {
      const nl = output.indexOf('\n');
      if (nl > 0) output = output.slice(nl + 1);
      const fence = output.lastIndexOf('```');
      if (fence >= 0) output = output.slice(0, fence);
      output = output.trim();
    }

    try { JSON.parse(output); }
    catch (e) { console.log(`FAILED (${e instanceof Error ? e.message : e})`); continue; }

    await writeFile(join(DATA, 'tests', `${t.name}.json`), output);
    console.log('ok');
  }
}

async function run() {
  const llm   = makeLlm();
  const mcp   = new McpClient(mcpUrl());
  await mcp.initialize();
  const tools   = await mcp.listTools();
  const results: unknown[] = [];

  for (const tool of tools) {
    const testFile = join(DATA, 'tests', `${tool.name}.json`);
    if (!existsSync(testFile)) { console.log(`  ${tool.name}: no tests, skip`); continue; }

    const prompts = JSON.parse(await readFile(testFile, 'utf8')) as TestPrompt[];
    process.stdout.write(`  ${tool.name} (${prompts.length} prompts) `);

    for (const p of prompts) {
      try {
        const { tool: actual, args: actualArgs } = await llm.chatWithTools(p.prompt, tools);
        results.push({ tool: tool.name, category: p.category, prompt: p.prompt,
          actual_tool: actual, actual_args: actualArgs, expected_args: p.expected_args });
        process.stdout.write(actual === tool.name ? '.' : 'x');
      } catch (e) {
        results.push({ tool: tool.name, category: p.category, prompt: p.prompt,
          actual_tool: null, error: e instanceof Error ? e.message : String(e) });
        process.stdout.write('!');
      }
    }
    console.log();
  }

  await writeFile(join(DATA, 'runs', 'latest.json'), JSON.stringify(results, null, 2));
  console.log(`→ ${DATA}/runs/latest.json (${results.length} results)`);
}

async function score() {
  const llm   = makeLlm();
  const runs  = JSON.parse(await readFile(join(DATA, 'runs', 'latest.json'), 'utf8')) as RunResult[];
  const tools = JSON.parse(await readFile(join(DATA, 'tools.json'), 'utf8')) as ToolEntry[];

  const lines: string[] = [];
  const push = (...s: string[]) => lines.push(...s);

  const totalCorrect = runs.filter(r => r.actual_tool === r.tool).length;
  const pct = runs.length > 0 ? Math.round((totalCorrect / runs.length) * 100) : 0;

  push('# MCP Tool Eval Report', `Generated: ${new Date().toLocaleString('tr-TR')}`, '');
  push(`**Overall selection accuracy: ${totalCorrect}/${runs.length} (%${pct})**`, '');

  for (const [name, items] of groupBy(runs, r => r.tool)) {
    const correct  = items.filter(r => r.actual_tool === r.tool).length;
    const failures = items.filter(r => r.actual_tool !== r.tool);
    const acc      = Math.round((correct / items.length) * 100);

    push(`## \`${name}\``, `Selection: **${correct}/${items.length}** (%${acc})`);

    for (const [cat, catItems] of groupBy(items, r => r.category)) {
      const c = catItems.filter(r => r.actual_tool === r.tool).length;
      push(`- ${cat}: ${c}/${catItems.length}`);
    }

    if (failures.length > 0) {
      const confMap = new Map<string, number>();
      for (const f of failures)
        if (f.actual_tool) confMap.set(f.actual_tool, (confMap.get(f.actual_tool) ?? 0) + 1);

      const confusion = [...confMap.entries()].sort((a, b) => b[1] - a[1]);
      if (confusion.length > 0) {
        push('', 'Confused with:');
        for (const [k, v] of confusion) push(`- \`${k}\` × ${v}`);
      }

      push('', 'Failed prompts:');
      for (const f of failures.slice(0, 8))
        push(`- "${f.prompt}" → \`${f.actual_tool ?? '(none)'}\``);

      const toolNode = tools.find(t => t.name === name);
      if (toolNode) {
        const failText = failures.slice(0, 10)
          .map(f => `  "${f.prompt}" → got: ${f.actual_tool ?? 'none'}`).join('\n');
        const sys2  = 'You analyze MCP tool description quality. Be concrete and brief. Suggest specific edits, not generic advice.';
        const user2 = `Tool name: ${name}\nCurrent description: ${toolNode.description}\n\nThis tool was NOT selected (or wrong tool was selected) for these prompts:\n${failText}\n\nSuggest description amendments (additions/rewordings/disambiguators) that would help the model pick this tool. Use a short bulleted list. If the wrong tool was a similar one, suggest disambiguator phrasing like "use this for X, not for Y, use Z for Y".`;
        try {
          const suggestion = await llm.chat(sys2, user2, 0.3);
          push('', '**Description suggestions:**', '', suggestion.trim());
        } catch (e) {
          push('', `*(suggestion failed: ${e instanceof Error ? e.message : e})*`);
        }
      }
    }
    push('');
  }

  const path = join(DATA, 'report.md');
  await writeFile(path, lines.join('\n'));
  console.log(`→ ${path}`);
  console.log(`Overall: ${totalCorrect}/${runs.length} (%${pct})`);
}
