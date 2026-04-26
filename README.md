# mcp-probe

> **Your MCP tool works with GPT-4o. But does it work with Claude? With Llama? With the model your users actually run?**

MCP tool descriptions are code. They tell the model when to call your tool, with what arguments, and why — not you. If the description is weak, the tool gets ignored or misused, regardless of how good the implementation is.

**mcp-probe** stress-tests your tool descriptions across any LLM. It generates adversarial prompts, measures selection accuracy per model, and tells you exactly which descriptions to fix — and how.

```
discover → generate → run → score
```

---

## The core insight

When you build an MCP server, you write descriptions once but they run on every model your users have. A description tuned for GPT-4o might silently fail on Claude 3.5 or Llama 3.

```bash
# Test the same tool descriptions against three different models
LLM_MODEL=gpt-4o-mini   npm run run -- --mcp http://localhost:3000/mcp
LLM_MODEL=llama3        npm run run -- --mcp http://localhost:3000/mcp
LLM_MODEL=qwen3-32b     npm run run -- --mcp http://localhost:3000/mcp
```

Run `score` after each. Compare the reports. The gaps show you exactly where your descriptions are model-specific rather than robust.

**Intentionally use a weaker model for testing.** If a small model can't pick your tool correctly, neither can your users on resource-constrained setups. A description that only works on frontier models is a description that needs work.

---

## How it works

| Step | Command | What it does |
|---|---|---|
| 1 | `discover` | Connects to your MCP server, lists all tools → `data/tools.json` |
| 2 | `generate` | Uses an LLM to write test prompts for each tool (direct / indirect / adversarial) → `data/tests/` |
| 3 | `run` | Sends every prompt to the LLM with tool-calling enabled, records which tool was selected → `data/runs/latest.json` |
| 4 | `score` | Computes accuracy per tool and category, finds confusion patterns, asks the LLM to suggest description fixes → `data/report.md` |

**Prompt categories**

- **direct** — clear, explicit intent matching the tool
- **indirect** — user describes a situation; the right tool must be inferred
- **adversarial** — ambiguous wording that could match a similar tool

> Generate prompts once with your best model. Run and score across as many models as you want — the test set stays fixed, results are comparable.

---

## Prerequisites

- Node.js ≥ 18
- An HTTP MCP server (Streamable HTTP or SSE transport)
- An OpenAI-compatible LLM API (OpenAI, Anthropic via proxy, Ollama, etc.)

---

## Installation

```bash
git clone https://github.com/turkyilmazomer/mcp-probe
cd mcp-probe
npm install
```

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `LLM_URL` | yes | Base URL of an OpenAI-compatible API (e.g. `https://api.openai.com/v1`) |
| `LLM_MODEL` | yes | Model name (e.g. `gpt-4o`, `claude-3-5-sonnet`, `llama3`) |
| `LLM_KEY` | no | API key — omit for local models (Ollama, etc.) |
| `MCP_URL` | no | MCP server endpoint — can also be passed with `--mcp` per command |

```bash
export LLM_URL=https://api.openai.com/v1
export LLM_MODEL=gpt-4o
export LLM_KEY=sk-...
export MCP_URL=http://localhost:3000/mcp
```

---

## Usage

### Step 1 — discover

```bash
npm run discover -- --mcp http://localhost:3000/mcp
```

```
Found 6 tools:
  - get_weather
  - search_flights
  - book_hotel
  - currency_convert
  - translate_text
  - send_email
→ data/tools.json
```

### Step 2 — generate

Generate test prompts with your strongest model. You only need to do this once.

```bash
LLM_MODEL=gpt-4o npm run generate -- --n 5
```

```
Generating prompts for get_weather... ok
Generating prompts for search_flights... ok
```

Each tool gets a file like `data/tests/get_weather.json`:

```json
[
  { "category": "direct",      "prompt": "What's the weather in Istanbul right now?",              "expected_args": { "city": "Istanbul" } },
  { "category": "indirect",    "prompt": "I'm heading out, should I bring an umbrella to Ankara?", "expected_args": { "city": "Ankara" } },
  { "category": "adversarial", "prompt": "Give me a forecast for next week in İzmir",              "expected_args": { "city": "İzmir" } }
]
```

### Step 3 — run

Send every prompt to the model under test. Swap `LLM_MODEL` to test a different model — no need to regenerate prompts.

```bash
LLM_MODEL=gpt-4o-mini npm run run -- --mcp http://localhost:3000/mcp
```

```
  get_weather (15 prompts) ...........xx..
  search_flights (15 prompts) ..............x
  book_hotel (15 prompts) ...............
→ data/runs/latest.json (45 results)
```

`.` = correct &nbsp; `x` = wrong tool &nbsp; `!` = error

### Step 4 — score

```bash
npm run score
```

```
→ data/report.md
Overall: 41/45 (%91)
```

**Example `data/report.md`:**

```markdown
# MCP Tool Eval Report

**Overall selection accuracy: 41/45 (%91)**

## `get_weather`
Selection: **13/15** (%87)
- direct: 5/5
- indirect: 4/5
- adversarial: 4/5

Confused with:
- `search_flights` × 2

Failed prompts:
- "Give me a forecast for next week in İzmir" → `search_flights`

**Description suggestions:**
- Add "for current conditions and forecasts" to distinguish from flight search
- Clarify "use this for weather queries, not for travel planning — use search_flights for that"
```

---

## Cross-model workflow

```bash
# Generate prompts once with your best model
LLM_MODEL=gpt-4o npm run generate -- --n 5

# Test against multiple models
for MODEL in gpt-4o-mini llama3 qwen3-32b; do
  LLM_MODEL=$MODEL npm run run -- --mcp http://localhost:3000/mcp
  LLM_MODEL=$MODEL npm run score
  cp data/report.md data/report-$MODEL.md
done
```

Compare `report-gpt-4o-mini.md`, `report-llama3.md`, `report-qwen3-32b.md` side by side. Tools that fail only on smaller models need clearer, more explicit descriptions. Tools that fail everywhere need a rewrite.

---

## Iteration

After fixing a description in your MCP server:

```bash
npm run discover -- --mcp http://localhost:3000/mcp  # pick up new descriptions
npm run run     -- --mcp http://localhost:3000/mcp  # same test set, fresh results
npm run score                                        # compare with previous report
```

Re-run `generate` only when you add new tools or want to refresh the test set.

---

## Project structure

```
mcp-probe/
├── src/
│   ├── index.ts        # CLI entry point and pipeline commands
│   ├── mcp-client.ts   # MCP HTTP client (Streamable HTTP + SSE)
│   └── llm-client.ts   # OpenAI-compatible LLM client with tool calling
├── data/
│   ├── tests/          # generated prompts per tool (created by generate)
│   ├── runs/           # run results (created by run)
│   └── tools.json      # discovered tools (created by discover)
├── .claude/
│   └── skills/mcp-probe/SKILL.md   # Claude Code skill
├── .github/
│   └── skills/mcp-probe/SKILL.md   # GitHub Copilot skill
└── package.json
```

## AI assistant integration

### Claude Code

Type `/mcp-probe` — Claude will ask for your MCP URL and LLM config, then run the full pipeline interactively.

### GitHub Copilot (VS Code)

Type `#` in Copilot Chat and select `mcp-probe` from the dropdown.

---

## License

MIT
