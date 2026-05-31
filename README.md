# Shipressure ⚡

<p align="center">
  <a href="https://www.npmjs.com/package/shipressure"><img src="https://img.shields.io/npm/v/shipressure?style=flat-square&logo=npm&color=cb3837" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/shipressure"><img src="https://img.shields.io/npm/dm/shipressure?style=flat-square&logo=npm&color=cb3837" alt="npm downloads"></a>
  <a href="https://github.com/shivamprajapati17/shipressure"><img src="https://img.shields.io/github/stars/shivamprajapati17/shipressure?style=flat-square&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/shivamprajapati17/shipressure/actions"><img src="https://img.shields.io/github/actions/workflow/status/shivamprajapati17/shipressure/publish.yml?branch=master&style=flat-square&logo=githubactions&label=CI" alt="CI status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/shipressure?style=flat-square" alt="license"></a>
  <a href="https://github.com/shivamprajapati17/shipressure/blob/master/package.json"><img src="https://img.shields.io/node/v/shipressure?style=flat-square&logo=nodedotjs" alt="node version"></a>
</p>

**Universal AI Context Compression**

Compress documents, repositories, documentation sites, and spreadsheets into highly compressed AI-ready context. One command. Zero cloud dependency. Optimized for AI coding agents.

```
npx shipressure ./api.pdf
npx shipressure ./docs/
npx shipressure https://github.com/user/repo
```

## Vision

Instead of manually uploading files into Claude, Codex, Gemini, or OpenCode — provide a file path, directory, URL, or repository. Shipressure automatically reads content, extracts important information, removes noise, compresses context, and produces token-efficient plain text optimized for AI agents.

## Installation

```bash
npm install -g shipressure
```

Or run directly:

```bash
npx shipressure@latest install
```

## Usage

### Files
```bash
shipressure ./api.pdf
shipressure ./document.docx
shipressure ./data.csv
shipressure ./presentation.pptx
```

### Directories
```bash
shipressure ./docs/
shipressure ./src/
```

### Documentation Websites
```bash
shipressure https://docs.api.nvidia.com
shipressure https://docs.example.com
```

### GitHub Repositories
```bash
shipressure https://github.com/vercel/next.js
shipressure https://github.com/user/repo
```

## Modes

| Mode | Flag | Use Case |
|------|------|----------|
| Balanced | _(default)_ | General purpose |
| Full | `--full` | Preserve everything |
| Ultra | `--ultra` | Maximum compression |

### Examples
```bash
shipressure file.pdf              # Balanced (default)
shipressure file.pdf --full       # Preserve everything
shipressure file.pdf --ultra      # Maximum compression
```

## Supported Formats

- **Documents:** PDF, DOCX, TXT, MD, RTF
- **Spreadsheets:** XLSX, XLS, CSV, ODS
- **Presentations:** PPTX, PPT
- **Codebases:** JS, TS, Python, Rust, Solidity, Go (via GitHub)
- **Documentation:** GitBook, Mintlify, Docusaurus, Readme, OpenAPI (via URL)

## How It Works

```
User Input → Parser Engine → Normalizer → Compressor → Context Builder → AI Output
```

1. **Input Resolver** — Detects input type (file, directory, URL, GitHub)
2. **Parser Engine** — Extracts text from PDF, DOCX, XLSX, CSV, MD, PPTX
3. **Documentation Scraper** — Crawls docs sites (GitBook, Mintlify, Docusaurus, Readme)
4. **GitHub Analyzer** — Analyzes repos (README, structure, config, source files)
5. **Normalizer** — Converts all content to standard format
6. **Compression Engine** — Removes noise, deduplicates, condenses text
7. **Context Builder** — Outputs compressed AI-optimized context

## Output Format

```
[SHIPRESSURE]

PROJECT: NVIDIA NIM

AUTH
OAuth2 → token exchange
API Keys supported

ENDPOINTS
POST /chat/completions
GET /models

MODELS
Llama 3.3
DeepSeek R1

[/SHIPRESSURE]

// ⚡ ~350 tokens | 82% compression
```

## Token Reduction

| Mode | Typical Reduction |
|------|------------------|
| Full | 0% (preserve) |
| Balanced | 40-60% |
| Ultra | 60-95% |

## AI Agent Integration

### Claude Code
```
/shipressure ./api.pdf
```

### Codex
```
use shipressure ./api.pdf
```

### OpenCode
```
use shipressure ./api.pdf
```

### Cursor
```
use shipressure ./api.pdf
```

## API Usage

```typescript
import { shipressure } from 'shipressure';

const result = await shipressure('./api.pdf', { mode: 'balanced' });
console.log(result.content);
console.log(`Compressed: ${result.context.tokenEstimate} tokens`);
console.log(`Reduction: ${result.context.compressionRatio}%`);
```

## Project Structure

```
shipressure/
├── src/
│   ├── cli/              # CLI entry point
│   ├── parsers/          # File parsers (PDF, DOCX, XLSX, CSV, MD, PPTX)
│   ├── scrapers/         # Documentation & GitHub scrapers
│   ├── normalizers/      # Content normalization
│   ├── compressors/      # Token compression engine
│   ├── builders/         # Context builder
│   ├── resolvers/        # Input resolver
│   └── types/            # TypeScript types
├── skill.md              # AI agent skill manifest
├── package.json
└── README.md
```

## Future Versions

- **v1** — Document compression
- **v2** — Repository intelligence
- **v3** — RAG generation
- **v4** — Vector embeddings
- **v5** — Knowledge graph generation

## License

MIT
