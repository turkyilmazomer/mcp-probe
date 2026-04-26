# mcp-probe

**mcp-probe** evaluates how well an LLM selects the right tool from an MCP server. It auto-generates test prompts, runs them against the model, and produces an accuracy report with suggestions for improving tool descriptions.

```
discover → generate → run → score
```

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

---

## Prerequisites

- Node.js ≥ 18
- An HTTP MCP server (Streamable HTTP or SSE transport)
- An OpenAI-compatible LLM API (OpenAI, Anthropic via proxy, Ollama, etc.)

---

## Installation

```bash
git clone https://github.com/your-org/mcp-probe
cd mcp-probe
npm install
```

---

## Configuration

Set these environment variables before running (or add them to a `.env` file — just don't commit it):

| Variable | Required | Description |
|---|---|---|
| `LLM_URL` | yes | Base URL of an OpenAI-compatible API (e.g. `https://api.openai.com/v1`) |
| `LLM_MODEL` | yes | Model name to use (e.g. `gpt-4o`, `claude-3-5-sonnet`, `llama3`) |
| `LLM_KEY` | no | API key — omit if your endpoint doesn't need one (e.g. local Ollama) |
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

Fetch all tools from the MCP server and save their names, descriptions, and schemas.

```bash
npm run discover -- --mcp http://localhost:3000/mcp
```

Output:

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

---

### Step 2 — generate

Generate test prompts for every tool using the LLM. Use `--n` to control how many prompts per category (default: 3, so 9 prompts per tool).

```bash
npm run generate -- --n 5
```

Output:

```
Generating prompts for get_weather... ok
Generating prompts for search_flights... ok
Generating prompts for book_hotel... ok
```

Each tool gets a file like `data/tests/get_weather.json`:

```json
[
  { "category": "direct",      "prompt": "What's the weather in Istanbul right now?",              "expected_args": { "city": "Istanbul" } },
  { "category": "indirect",    "prompt": "I'm heading out, should I bring an umbrella to Ankara?", "expected_args": { "city": "Ankara" } },
  { "category": "adversarial", "prompt": "Give me a forecast for next week in İzmir",              "expected_args": { "city": "İzmir" } }
]
```

---

### Step 3 — run

Send every prompt to the LLM with tool-calling enabled and record which tool was selected.

```bash
npm run run -- --mcp http://localhost:3000/mcp
```

Output (`.` = correct, `x` = wrong tool, `!` = error):

```
  get_weather (15 prompts) ...........xx..
  search_flights (15 prompts) ..............x
  book_hotel (15 prompts) ...............
→ data/runs/latest.json (45 results)
```

---

### Step 4 — score

Compute accuracy, find confusion patterns, and get LLM-generated suggestions for fixing weak tool descriptions.

```bash
npm run score
```

Output:

```
→ data/report.md
Overall: 41/45 (%91)
```

**Example `data/report.md`:**

```markdown
# MCP Tool Eval Report
Generated: 26.04.2026 14:32:00

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

## Full example (end to end)

```bash
# 1. Start your MCP server (example: a local dev server)
node my-mcp-server.js &

# 2. Set env vars
export LLM_URL=https://api.openai.com/v1
export LLM_MODEL=gpt-4o-mini
export LLM_KEY=sk-...

# 3. Run the full pipeline
npm run discover -- --mcp http://localhost:3000/mcp
npm run generate -- --n 3
npm run run     -- --mcp http://localhost:3000/mcp
npm run score

# 4. Read the report
open data/report.md
```

---

## Project structure

```
mcp-probe/
├── src/
│   ├── index.ts        # CLI entry point and command implementations
│   ├── mcp-client.ts   # MCP HTTP client (Streamable HTTP + SSE)
│   └── llm-client.ts   # OpenAI-compatible LLM client with tool calling
├── data/
│   ├── tools.json      # discovered tools (created by discover)
│   ├── tests/          # generated prompts per tool (created by generate)
│   ├── runs/           # run results (created by run)
│   └── report.md       # final report (created by score)
├── .claude/
│   └── skills/
│       └── mcp-probe/
│           └── SKILL.md  # Claude Code skill definition
├── .github/
│   └── skills/
│       └── mcp-probe/
│           └── SKILL.md  # GitHub Copilot skill definition
└── package.json
```

## AI assistant integration

### Claude Code

Type `/mcp-probe` in Claude Code — it will guide you through the full pipeline interactively.

### GitHub Copilot (VS Code)

Type `#` in the Copilot Chat input and select `mcp-probe` from the dropdown.

---

## Tips

- **Re-run just `score`** after editing tool descriptions in your MCP server — no need to re-generate or re-run.
- **Increase `--n`** for more thorough evaluation; `--n 10` gives 30 prompts per tool.
- **Use a weaker model** for `generate` and `run` to find description weaknesses a strong model would overlook.
- The report's "Description suggestions" section is generated by the LLM — treat it as a starting point, not a prescription.

---

## License

MIT
