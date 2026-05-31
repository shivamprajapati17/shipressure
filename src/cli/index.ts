#!/usr/bin/env node

import { resolveInput } from '../resolvers/input-resolver.js';
import { parseFile } from '../parsers/index.js';
import { scrapeSource } from '../scrapers/index.js';
import { normalize } from '../normalizers/index.js';
import { buildContext } from '../builders/index.js';
import { CliOptions } from '../types/index.js';
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { join, extname } from 'path';

const SUPPORTED_EXTS = new Set(['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.ods', '.pptx', '.ppt', '.md', '.txt', '.rtf']);

function printVersion(): void {    try {
      const pkgPath = new URL('../../package.json', import.meta.url);
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      console.log(`Shipressure v${pkg.version}`);
    } catch {
      // Fallback: try current directory
      try {
        const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
        console.log(`Shipressure v${pkg.version}`);
      } catch {
        console.log('Shipressure v1.0.0');
      }
    }
}

function printHelp(): void {
  console.log(`
╔══════════════════════════════════════════════╗
║         Shipressure - AI Context Compression ║
╚══════════════════════════════════════════════╝

USAGE:
  shipressure <source> [options]

  use shipressure <source>   (in AI coding agent)

SOURCES:
  file.pdf         PDF documents
  file.docx        Word documents
  file.xlsx        Excel spreadsheets
  file.csv         CSV files
  file.md          Markdown files
  file.pptx        PowerPoint presentations
  folder/          Entire directory of files
  https://...      Documentation websites
  github.com/...   GitHub repositories

OPTIONS:
  --full           Full mode - preserve everything
  --ultra          Ultra compression - maximum token reduction
  --help           Show this help
  --version        Show version
  --verbose        Show processing details

MODES:
  (default)        Balanced compression
  --full           Preserve all content
  --ultra          Maximum compression (60-95% token reduction)

EXAMPLES:
  shipressure ./api.pdf
  shipressure ./docs/
  shipressure https://docs.example.com
  shipressure https://github.com/vercel/next.js
  shipressure ./file.pdf --ultra
  shipressure ./file.pdf --full
`);
}

function parseArgs(args: string[]): { source: string; options: CliOptions } {
  const options: CliOptions = { mode: 'balanced' };
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--full':
        options.mode = 'full';
        break;
      case '--ultra':
        options.mode = 'ultra';
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
      case '--version':
        printVersion();
        process.exit(0);
      case '--output':
        options.output = args[++i];
        break;
      default:
        if (!arg.startsWith('--')) {
          positional.push(arg);
        }
    }
  }

  if (positional.length === 0) {
    printHelp();
    process.exit(1);
  }

  return { source: positional[0], options };
}

function log(message: string, verbose?: boolean): void {
  if (verbose) {
    console.error(`[shipressure] ${message}`);
  }
}

async function processSource(source: string, options: CliOptions): Promise<string> {
  const input = resolveInput(source);
  
  log(`Input type: ${input.type}`, options.verbose);
  
  let normalized;
  
  switch (input.type) {
    case 'file': {
      if (!input.path || !input.extension || input.extension === 'unknown') {
        throw new Error(`Unsupported file: ${source}. Supported: PDF, DOCX, XLSX, CSV, MD, PPTX, TXT`);
      }
      log(`Parsing file: ${input.path}`, options.verbose);
      const parsed = await parseFile(input.path, input.extension as import('../types/index.js').SourceType);
      normalized = normalize(parsed);
      break;
    }
    
    case 'directory': {
      if (!input.path) throw new Error('Invalid directory path');
      log(`Scanning directory: ${input.path}`, options.verbose);
      normalized = await processDirectory(input.path, options);
      break;
    }
    
    case 'url': {
      if (!input.url) throw new Error('Invalid URL');
      log(`Scraping URL: ${input.url}`, options.verbose);
      const scraped = await scrapeSource(input.url);
      normalized = normalize(scraped);
      break;
    }
    
    case 'github': {
      if (!input.repoUrl) throw new Error('Invalid GitHub URL');
      log(`Analyzing GitHub repo: ${input.repoUrl}`, options.verbose);
      const analyzed = await scrapeSource(input.repoUrl);
      normalized = normalize(analyzed);
      break;
    }
    
    default:
      throw new Error(`Unknown input type: ${input.type}`);
  }
  
  log(`Content normalized: ${normalized.title}`, options.verbose);
  
  const result = buildContext(normalized, options.mode);
  
  log(`Compressed: ${result.context.tokenEstimate} tokens (${result.context.compressionRatio}% reduction)`, options.verbose);
  
  return result.content;
}

async function processDirectory(dirPath: string, options: CliOptions): Promise<import('../types/index.js').NormalizedContent> {
  const entries = await readdir(dirPath);
  const files = entries.filter(e => {
    const ext = extname(e).toLowerCase();
    return SUPPORTED_EXTS.has(ext);
  });

  if (files.length === 0) {
    throw new Error(`No supported files found in directory: ${dirPath}`);
  }

  const sections: import('../types/index.js').Section[] = [];
  const allCodeBlocks: import('../types/index.js').CodeBlock[] = [];
  const allTables: import('../types/index.js').Table[] = [];
  const metadata: Record<string, string> = { 'Directory': dirPath, 'Files': String(files.length) };

  sections.push({
    heading: 'Directory Contents',
    level: 1,
    content: `Directory: ${dirPath}\nFiles found: ${files.length}\n${files.join('\n')}`,
  });

  for (const file of files.slice(0, 20)) { // Max 20 files
    const filePath = join(dirPath, file);
    const ext = extname(file).toLowerCase().slice(1);
    const sourceType = ext as import('../types/index.js').SourceType;
    
    try {
      log(`  Processing: ${file}`, options.verbose);
      const parsed = await parseFile(filePath, sourceType);
      const normalized = normalize(parsed);
      
      sections.push(...normalized.sections);
      allCodeBlocks.push(...normalized.codeBlocks);
      allTables.push(...normalized.tables);
    } catch (err) {
      sections.push({
        heading: `File: ${file}`,
        level: 2,
        content: `Error processing: ${err}`,
      });
    }
  }

  return {
    title: `Directory: ${dirPath.split(/[/\\]/).pop() || 'root'}`,
    sections,
    tables: allTables,
    codeBlocks: allCodeBlocks,
    metadata,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // "install" command - print install instructions
  if (args[0] === 'install') {
    console.log('Installing Shipressure...');
    console.log('');
    console.log('Shipressure is already installed!');
    console.log('');
    console.log('Usage examples:');
    console.log('  npx shipressure ./file.pdf');
    console.log('  npx shipressure ./docs/');
    console.log('  npx shipressure https://github.com/user/repo');
    console.log('  npx shipressure https://docs.example.com');
    return;
  }

  const { source, options } = parseArgs(args);
  
  try {
    const result = await processSource(source, options);
    console.log(result);
  } catch (err) {
    console.error(`[shipressure] Error: ${err instanceof Error ? err.message : String(err)}`);
    if (options.verbose && err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
