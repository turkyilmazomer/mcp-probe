---
name: mcp-probe
description: >
  MCP server'daki tool description'larını test eder, LLM'in doğru tool'u seçip
  seçmediğini ölçer ve zayıf description'lar için iyileştirme önerir.
  Tetikleyiciler: "tool description'larımı test et", "tool seçim doğruluğunu ölç",
  "hangi prompt hangi tool'u tetikliyor", "description'larımı değerlendir", "/mcp-probe".
---

Tetiklendiğinde:

1. Kullanıcıdan şunları iste (verilmemişse):
   - **MCP server URL** — örn. `http://localhost:3000/mcp`
   - **LLM_URL** — OpenAI-uyumlu base URL
   - **LLM_MODEL** — model adı
   - **LLM_KEY** — opsiyonel

2. Sırayla çalıştır, her adımdan sonra özet ver:

### 1. Discover
```bash
npm run discover -- --mcp <MCP_URL>
```
Bulunan tool listesini kullanıcıya göster.

### 2. Generate
```bash
LLM_URL=<> LLM_MODEL=<> LLM_KEY=<> npm run generate -- --n 3
```
Her tool için direct / indirect / adversarial prompt'lar üretir → `data/tests/<tool>.json`.
Bitince sor: "Prompt'ları gözden geçirmek ister misin?"

### 3. Run
```bash
LLM_URL=<> LLM_MODEL=<> LLM_KEY=<> npm run run -- --mcp <MCP_URL>
```
`.` doğru · `x` yanlış · `!` hata

### 4. Score
```bash
LLM_URL=<> LLM_MODEL=<> LLM_KEY=<> npm run score
```

3. Rapor bittikten sonra:
   - Genel skoru söyle (örn. "%78")
   - En zayıf 2–3 tool ve confusion pattern'ini özetle
   - `data/report.md` dosyasını aç

## İterasyon

Description değişikliğinden sonra sadece `discover → run → score` çalıştır.
`generate` yalnızca yeni tool eklendiğinde veya prompt seti yetersiz kaldığında tekrar çalıştırılır.
