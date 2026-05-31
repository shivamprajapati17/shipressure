---
name: shipressure
version: 1.0.0
description: Universal AI Context Compression — compress documents, repos, and docs into AI-ready context
author: Shipressure
trigger: use shipressure
---

# Shipressure - Universal AI Context Compression

## Description
Compress documents, repositories, documentation sites, and spreadsheets into highly compressed AI-ready context. Optimized for AI coding agents (Claude Code, Codex, Gemini, OpenCode).

## Usage

### File
```
use shipressure ./api.pdf
use shipressure ./documentation.docx
use shipressure ./data.csv
```

### Directory
```
use shipressure ./docs/
use shipressure ./src/
```

### Website
```
use shipressure https://docs.example.com
use shipressure https://docs.api.example.com
```

### GitHub Repository
```
use shipressure https://github.com/vercel/next.js
use shipressure https://github.com/user/repo
```

## Modes

### Full Mode (preserve everything)
```
use shipressure file.pdf --full
```

### Balanced Mode (default)
```
use shipressure file.pdf
```

### Ultra Mode (maximum compression)
```
use shipressure file.pdf --ultra
```

## Supported Formats

| Type | Formats |
|------|---------|
| Documents | PDF, DOCX, TXT, MD, RTF |
| Spreadsheets | XLSX, XLS, CSV, ODS |
| Presentations | PPTX, PPT |
| Codebases | JS, TS, Python, Rust, Solidity, Go |
| Documentation | GitBook, Mintlify, Docusaurus, Readme, OpenAPI |

## Output Format
```
[SHIPRESSURE]

PROJECT: Project Name

SECTION_TITLE
- Entry 1
- Entry 2

[/SHIPRESSURE]
```

## Installation
```bash
npm install -g shipressure
# or
npx shipressure@latest install
```

## Response to user
When a user says "use shipressure <source>", run:
```bash
npx shipressure <source>
```
Then analyze the output and use it as context for the user's task.
