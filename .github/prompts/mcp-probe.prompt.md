# MCP Tool Eval

Bir MCP server'daki her tool için test prompt'ları üretir, LLM'in doğru tool'u seçip seçmediğini ölçer ve description iyileştirmeleri önerir.

## Başlamadan önce

Kullanıcıya şunları tek tek sor:

1. **MCP server URL** — örn. `https://tuik.dev/mcp`
2. **LLM_URL** — OpenAI-uyumlu base URL, örn. `https://api.openai.com/v1`
3. **LLM_MODEL** — model adı, örn. `gpt-4o`
4. **LLM_KEY** — API key (opsiyonel)

---

## Adımlar

### 1. Discover

```bash
npx tsx src/index.ts discover --mcp <MCP_URL>
```

Bulunan tool listesini kullanıcıya göster.

### 2. Generate

```bash
LLM_URL=<LLM_URL> LLM_MODEL=<LLM_MODEL> LLM_KEY=<LLM_KEY> npx tsx src/index.ts generate --n 3
```

Her tool için direct / indirect / adversarial prompt'lar üretir → `data/tests/<tool>.json`.

Bitince sor: "Prompt'ları gözden geçirmek ister misin? `data/tests/` altındaki JSON dosyalarını elle düzenleyebilirsin."

### 3. Run

```bash
LLM_URL=<LLM_URL> LLM_MODEL=<LLM_MODEL> LLM_KEY=<LLM_KEY> npx tsx src/index.ts run --mcp <MCP_URL>
```

`.` doğru seçim · `x` yanlış · `!` hata

### 4. Score

```bash
LLM_URL=<LLM_URL> LLM_MODEL=<LLM_MODEL> LLM_KEY=<LLM_KEY> npx tsx src/index.ts score
```

---

## Rapor

Score bittikten sonra:
1. Genel skoru söyle (örn. "%78")
2. En zayıf 2–3 tool ve hangi tool ile karıştırıldığını özetle
3. Tam rapor için `data/report.md` dosyasını aç

## İterasyon

Description değişikliğinden sonra sadece:
```
discover → run → score
```
`generate` yeniden çalıştırılmaz — test seti sabit kalır.
