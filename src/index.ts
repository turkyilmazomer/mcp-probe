import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile, rm, readdir } from 'node:fs/promises';
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
    case 'clean':    await clean(); break;
    default:
      console.log('Usage:');
      console.log('  npx tsx src/index.ts discover --mcp <url>');
      console.log('  npx tsx src/index.ts generate [--n 3]');
      console.log('  npx tsx src/index.ts run --mcp <url>');
      console.log('  npx tsx src/index.ts score');
      console.log('  npx tsx src/index.ts clean');
      console.log();
      console.log('Env vars: LLM_URL, LLM_MODEL, LLM_KEY (optional), MCP_URL');
  }
} catch (e) {
  console.error('ERROR:', e instanceof Error ? e.message : e);
  process.exit(1);
}

// ──────────────── commands ────────────────

async function clean() {
  const targets = [
    join(DATA, 'tools.json'),
    join(DATA, 'report.md'),
    join(DATA, 'report.html'),
    join(DATA, 'runs', 'latest.json'),
  ];

  for (const f of targets) {
    if (existsSync(f)) {
      await rm(f);
      console.log(`  deleted ${f}`);
    }
  }

  const testsDir = join(DATA, 'tests');
  if (existsSync(testsDir)) {
    for (const file of await readdir(testsDir)) {
      if (file === '.gitkeep') continue;
      await rm(join(testsDir, file));
      console.log(`  deleted ${join(testsDir, file)}`);
    }
  }

  console.log('✓ data/ cleaned');
}

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

  const totalCorrect = runs.filter(r => r.actual_tool === r.tool).length;
  const pct = runs.length > 0 ? Math.round((totalCorrect / runs.length) * 100) : 0;

  // ── 1. build report without LLM suggestions ──────────────────────────────
  const toolSections = new Map<string, string[]>();

  for (const [name, items] of groupBy(runs, r => r.tool)) {
    const correct  = items.filter(r => r.actual_tool === r.tool).length;
    const failures = items.filter(r => r.actual_tool !== r.tool);
    const acc      = Math.round((correct / items.length) * 100);

    const lines: string[] = [];
    lines.push(`## \`${name}\``, `Selection: **${correct}/${items.length}** (%${acc})`);

    for (const [cat, catItems] of groupBy(items, r => r.category)) {
      const c = catItems.filter(r => r.actual_tool === r.tool).length;
      lines.push(`- ${cat}: ${c}/${catItems.length}`);
    }

    if (failures.length > 0) {
      const confMap = new Map<string, number>();
      for (const f of failures)
        if (f.actual_tool) confMap.set(f.actual_tool, (confMap.get(f.actual_tool) ?? 0) + 1);

      const confusion = [...confMap.entries()].sort((a, b) => b[1] - a[1]);
      if (confusion.length > 0) {
        lines.push('', 'Confused with:');
        for (const [k, v] of confusion) lines.push(`- \`${k}\` × ${v}`);
      }

      lines.push('', 'Failed prompts:');
      for (const f of failures.slice(0, 8))
        lines.push(`- "${f.prompt}" → \`${f.actual_tool ?? '(none)'}\``);
    }

    toolSections.set(name, lines);
  }

  const writeReports = async (sections: Map<string, string[]>) => {
    const header = [
      '# MCP Tool Eval Report',
      `Generated: ${new Date().toLocaleString('tr-TR')}`,
      '',
      `**Overall selection accuracy: ${totalCorrect}/${runs.length} (%${pct})**`,
      '',
    ];
    const body = [...sections.values()].flatMap(l => [...l, '']);
    await writeFile(join(DATA, 'report.md'), [...header, ...body].join('\n'));
    await writeFile(join(DATA, 'report.html'), buildHtml(runs, tools, totalCorrect, pct));
  };

  // ── 2. write reports immediately ─────────────────────────────────────────
  await writeReports(toolSections);
  console.log(`→ ${join(DATA, 'report.md')}`);
  console.log(`→ ${join(DATA, 'report.html')}`);
  console.log(`Overall: ${totalCorrect}/${runs.length} (%${pct})`);

  // ── 3. fetch LLM suggestions and append (non-blocking per tool) ──────────
  console.log('Fetching description suggestions...');
  for (const [name, items] of groupBy(runs, r => r.tool)) {
    const failures = items.filter(r => r.actual_tool !== r.tool);
    if (failures.length === 0) continue;

    const toolNode = tools.find(t => t.name === name);
    if (!toolNode) continue;

    process.stdout.write(`  ${name}... `);
    const failText = failures.slice(0, 10)
      .map(f => `  "${f.prompt}" → got: ${f.actual_tool ?? 'none'}`).join('\n');
    const sys2  = 'You analyze MCP tool description quality. Be concrete and brief. Suggest specific edits, not generic advice.';
    const user2 = `Tool name: ${name}\nCurrent description: ${toolNode.description}\n\nThis tool was NOT selected (or wrong tool was selected) for these prompts:\n${failText}\n\nSuggest description amendments (additions/rewordings/disambiguators) that would help the model pick this tool. Use a short bulleted list. If the wrong tool was a similar one, suggest disambiguator phrasing like "use this for X, not for Y, use Z for Y".`;
    try {
      const suggestion = await llm.chat(sys2, user2, 0.3);
      toolSections.get(name)?.push('', '**Description suggestions:**', '', suggestion.trim());
      console.log('ok');
    } catch (e) {
      toolSections.get(name)?.push('', `*(suggestion failed: ${e instanceof Error ? e.message : e})*`);
      console.log('failed');
    }

    // update reports after each suggestion so partial results are persisted
    await writeReports(toolSections);
  }
}

function scoreColor(pct: number) {
  if (pct >= 80) return '#22c55e';
  if (pct >= 60) return '#f59e0b';
  return '#ef4444';
}

function buildHtml(
  runs: RunResult[],
  tools: ToolEntry[],
  totalCorrect: number,
  pct: number,
): string {
  const generated = new Date().toLocaleString('tr-TR');
  const model     = process.env['LLM_MODEL'] ?? 'unknown model';

  const toolCards = [...groupBy(runs, r => r.tool)].map(([name, items]) => {
    const correct  = items.filter(r => r.actual_tool === r.tool).length;
    const failures = items.filter(r => r.actual_tool !== r.tool);
    const acc      = Math.round((correct / items.length) * 100);
    const color    = scoreColor(acc);

    const catRows = [...groupBy(items, r => r.category)].map(([cat, catItems]) => {
      const c    = catItems.filter(r => r.actual_tool === r.tool).length;
      const catP = Math.round((c / catItems.length) * 100);
      return `<div class="cat-row">
        <span class="cat-label">${cat}</span>
        <div class="bar-wrap"><div class="bar" style="width:${catP}%;background:${scoreColor(catP)}"></div></div>
        <span class="cat-score">${c}/${catItems.length}</span>
      </div>`;
    }).join('');

    const confMap = new Map<string, number>();
    for (const f of failures) if (f.actual_tool) confMap.set(f.actual_tool, (confMap.get(f.actual_tool) ?? 0) + 1);
    const confRows = [...confMap.entries()].sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<span class="tag">→ <code>${k}</code> ×${v}</span>`).join(' ');

    const failRows = failures.slice(0, 6)
      .map(f => `<li>"${f.prompt}" <span class="got">→ ${f.actual_tool ?? '(none)'}</span></li>`).join('');

    const toolNode = tools.find(t => t.name === name);
    const descBox = toolNode
      ? `<div class="desc">${toolNode.description}</div>`
      : '';

    return `<div class="card">
      <div class="card-header">
        <span class="tool-name"><code>${name}</code></span>
        <span class="badge" style="background:${color}">${acc}%</span>
      </div>
      <div class="accuracy-bar">
        <div class="accuracy-fill" style="width:${acc}%;background:${color}"></div>
      </div>
      ${descBox}
      <div class="cats">${catRows}</div>
      ${confRows ? `<div class="conf-section"><strong>Confused with:</strong><br>${confRows}</div>` : ''}
      ${failRows ? `<div class="fail-section"><strong>Failed prompts:</strong><ul>${failRows}</ul></div>` : ''}
    </div>`;
  }).join('');

  const overallColor = scoreColor(pct);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MCP Tool Eval Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:2rem 1rem}
  a{color:#38bdf8}
  .container{max-width:900px;margin:0 auto}
  header{text-align:center;margin-bottom:3rem}
  header h1{font-size:1.5rem;color:#94a3b8;font-weight:500;margin-bottom:1rem}
  .overall{display:inline-block;font-size:5rem;font-weight:800;line-height:1;color:${overallColor}}
  .overall-sub{font-size:1rem;color:#64748b;margin-top:.5rem}
  .meta{margin-top:1rem;font-size:.85rem;color:#475569}
  .grid{display:grid;gap:1.25rem}
  .card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:1.5rem}
  .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem}
  .tool-name code{font-size:1rem;color:#e2e8f0;background:#0f172a;padding:.2rem .5rem;border-radius:6px}
  .badge{font-size:.9rem;font-weight:700;padding:.3rem .75rem;border-radius:999px;color:#fff}
  .accuracy-bar{height:6px;background:#334155;border-radius:3px;overflow:hidden;margin-bottom:1rem}
  .accuracy-fill{height:100%;border-radius:3px;transition:width .3s}
  .desc{font-size:.8rem;color:#64748b;margin-bottom:1rem;line-height:1.5;border-left:2px solid #334155;padding-left:.75rem}
  .cats{display:flex;flex-direction:column;gap:.4rem;margin-bottom:.75rem}
  .cat-row{display:flex;align-items:center;gap:.75rem;font-size:.82rem}
  .cat-label{width:90px;color:#94a3b8;text-transform:capitalize}
  .bar-wrap{flex:1;background:#0f172a;border-radius:3px;height:6px;overflow:hidden}
  .bar{height:100%;border-radius:3px}
  .cat-score{width:40px;text-align:right;color:#64748b;font-size:.8rem}
  .conf-section{margin-top:.75rem;font-size:.82rem;color:#94a3b8}
  .tag{display:inline-block;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:.15rem .5rem;margin:.2rem .2rem 0 0;font-size:.78rem}
  .tag code{color:#f472b6}
  .fail-section{margin-top:.75rem;font-size:.82rem;color:#94a3b8}
  .fail-section ul{margin-top:.4rem;padding-left:1.2rem;display:flex;flex-direction:column;gap:.3rem}
  .fail-section li{color:#64748b}
  .got{color:#f87171}
  footer{text-align:center;margin-top:3rem;font-size:.8rem;color:#334155}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>MCP Tool Eval Report</h1>
    <div class="overall">${pct}%</div>
    <div class="overall-sub">${totalCorrect} / ${runs.length} correct selections</div>
    <div class="meta">Model: <strong>${model}</strong> &nbsp;·&nbsp; ${generated}</div>
  </header>
  <div class="grid">${toolCards}</div>
  <footer>generated by <a href="https://github.com/turkyilmazomer/mcp-probe">mcp-probe</a></footer>
</div>
</body>
</html>`;
}
