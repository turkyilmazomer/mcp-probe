---
name: mcp-probe
description: "MCP server'daki tool description'larını test eder. LLM'in doğru tool'u seçip seçmediğini ölçer ve description iyileştirmeleri önerir. Tetikleyiciler: 'MCP tool'larımı test et', 'tool seçim doğruluğunu ölç', 'description'larımı değerlendir', 'hangi prompt hangi tool'u tetikliyor'."
argument-hint: "MCP server URL (örn. http://localhost:3000/mcp)"
---

# MCP Tool Eval

Bu skill bir MCP server'daki her tool'un description'ından test prompt'ları üretir, LLM'in doğru tool'u seçip seçmediğini ölçer ve description iyileştirmeleri önerir.

## When to use

Kullanıcı şunlardan birini istediğinde:
- "MCP tool'larımın description'larını test et"
- "Hangi prompt hangi tool'u tetikliyor"
- "Tool seçim doğruluğunu ölç"
- "Description'ım yeterince ayırt edici mi"

## Prerequisites

Çalıştırmadan önce şunlar gerekli:
- **MCP server URL** (Streamable HTTP, örn. `http://localhost:5000/mcp`) — kullanıcıdan iste
- **LLM endpoint** env vars:
  - `LLM_URL` — OpenAI-uyumlu base URL (örn. `https://api.openai.com/v1`)
  - `LLM_MODEL` — model adı (örn. `gpt-4o`, `qwen3-32b`)
  - `LLM_KEY` — opsiyonel
- Node.js ≥ 18

## Workflow

Sırayla çalıştır. Her adımdan sonra çıktıyı kullanıcıya özetle.

### 1. Discover

```bash
npm run discover -- --mcp <MCP_URL>
```

`data/tools.json` üretir (her tool'un name, description, inputSchema'sı).

### 2. Generate test prompts

```bash
npm run generate -- --n 3
```

Her tool için 3 kategoride (direct/indirect/adversarial) 3'er prompt üretir → `data/tests/<tool>.json`.

**Önemli:** Prompt'ları kullanıcıya göster, gözden geçirmesini iste. Yanlış prompt = yanlış eval. Kullanıcı isterse `data/tests/*.json` dosyalarını elle düzenleyebilir.

### 3. Run

```bash
npm run run -- --mcp <MCP_URL>
```

Her prompt'u LLM'e gönderir (tüm tool'lar mevcut), hangi tool'u seçtiğini kaydeder → `data/runs/latest.json`.

### 4. Score

```bash
npm run score
```

`data/report.md` üretir:
- Genel doğruluk
- Tool başına accuracy (kategori ayrımıyla)
- Confusion: yanlış seçilen tool'lar
- LLM tarafından önerilen description iyileştirmeleri

## Reporting

Score adımı bittiğinde kullanıcıya:
1. Genel skoru söyle (örn. "%72")
2. En zayıf 2-3 tool'u ve confusion pattern'ini özetle
3. Tam raporu açmasını öner: `data/report.md`

## Iteration

Kullanıcı description'ı değiştirdikten sonra:
- `discover` → `run` → `score` (yeniden generate'e gerek yok; aynı test seti)
- Yeni rapor ile öncekini karşılaştır

`generate` sadece şu durumlarda yeniden çalıştırılır:
- Yeni tool eklendiğinde
- Mevcut prompt'lar yetersiz görünüyorsa

## Notes

- Param accuracy v1'de yok (sadece tool selection ölçülüyor); ihtiyaç olursa eklenebilir
- Test prompt'lar dosyada kalıcı — runlar arası tutarlılık için
- Aynı LLM hem prompt üretiyor hem eval'de kullanılıyor; bias riski varsa farklı modeller kullan (env var değiştir)
