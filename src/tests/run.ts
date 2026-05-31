import { parseMarkdownContent } from '../parsers/markdown.js';
import { normalize } from '../normalizers/index.js';
import { compress, formatOutput } from '../compressors/index.js';
import { resolveInput } from '../resolvers/input-resolver.js';

const sampleMd = `# Shipressure Test

## Overview
This is a test document for Shipressure compression engine.

## Authentication
Authentication requires OAuth2 login and token exchange.
Please note that you need to implement OAuth2 properly.
It is important to note that tokens expire after 24 hours.

## API Endpoints

### POST /chat/completions
This endpoint is used for chat completions.
The request body should include the model and messages.
Please ensure you have a valid API key.

### GET /models
This endpoint lists all available models.
The response includes model names and capabilities.

## Configuration
\`\`\`json
{
  "apiKey": "your-key-here",
  "model": "gpt-4",
  "temperature": 0.7
}
\`\`\`

## Table
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users | List users |
| POST | /users | Create user |
| DELETE | /users/:id | Delete user |
`;

async function runTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  console.log('=== Shipressure Test Suite ===\n');

  // Test 1: Input Resolver
  console.log('Test 1: Input Resolver');
  const fileResult = resolveInput('./test.pdf');
  if (fileResult.type === 'file') {
    console.log('  ✓ File input resolved correctly');
    passed++;
  } else {
    console.log('  ✗ File input resolution failed');
    failed++;
  }

  const urlResult = resolveInput('https://github.com/user/repo');
  if (urlResult.type === 'github') {
    console.log('  ✓ GitHub URL resolved correctly');
    passed++;
  } else {
    console.log('  ✗ GitHub URL resolution failed');
    failed++;
  }

  // Test 2: Markdown Parser
  console.log('Test 2: Markdown Parser');
  const parsed = parseMarkdownContent(sampleMd);
  if (parsed.sections.length >= 4 && parsed.codeBlocks.length === 1 && parsed.tables.length === 1) {
    console.log(`  ✓ Parsed ${parsed.sections.length} sections, ${parsed.codeBlocks.length} code blocks, ${parsed.tables.length} tables`);
    passed++;
  } else {
    console.log(`  ✗ Markdown parsing: ${parsed.sections.length}s, ${parsed.codeBlocks.length}c, ${parsed.tables.length}t`);
    failed++;
  }

  // Test 3: Normalizer
  console.log('Test 3: Normalizer');
  const normalized = normalize(parsed);
  if (normalized.title && normalized.sections.length > 0) {
    console.log(`  ✓ Normalized: ${normalized.title} (${normalized.sections.length} sections)`);
    passed++;
  } else {
    console.log('  ✗ Normalization failed');
    failed++;
  }

  // Test 4: Compression - all modes produce valid output
  console.log('Test 4: All Compression Modes');
  const balanced = compress(normalized, 'balanced');
  const ultra = compress(normalized, 'ultra');
  const full = compress(normalized, 'full');

  let modeOk = true;
  if (balanced.sections.length === 0) { console.log('  ✗ Balanced: no sections'); modeOk = false; }
  if (ultra.sections.length === 0) { console.log('  ✗ Ultra: no sections'); modeOk = false; }
  if (full.sections.length === 0) { console.log('  ✗ Full: no sections'); modeOk = false; }

  if (modeOk) {
    console.log(`  ✓ All modes produce valid sections`);
    console.log(`    Balanced: ~${balanced.tokenEstimate}t (${balanced.compressionRatio}%)`);
    console.log(`    Ultra:    ~${ultra.tokenEstimate}t (${ultra.compressionRatio}%)`);
    console.log(`    Full:     ~${full.tokenEstimate}t (${full.compressionRatio}%)`);
    passed++;
  } else {
    failed++;
  }

  // Test 5: Ultra produces fewer tokens than full (more compression)
  console.log('Test 5: Ultra < Full Tokens');
  if (ultra.tokenEstimate <= full.tokenEstimate) {
    console.log(`  ✓ Ultra (${ultra.tokenEstimate}) ≤ Full (${full.tokenEstimate}) tokens`);
    passed++;
  } else {
    console.log(`  ✗ Ultra (${ultra.tokenEstimate}) > Full (${full.tokenEstimate}) tokens`);
    failed++;
  }

  // Test 6: Output Format
  console.log('Test 6: Output Format');
  const output = formatOutput(balanced);
  if (output.includes('[SHIPRESSURE]') && output.includes('[/SHIPRESSURE]')) {
    const stats = output.includes('% compression');
    console.log(`  ✓ Output format correct${stats ? ' with stats' : ''}`);
    passed++;
  } else {
    console.log('  ✗ Output format missing markers');
    failed++;
  }

  // Test 7: Content integrity - key info preserved
  console.log('Test 7: Content Integrity');
  const fullOutput = formatOutput(full).toLowerCase();
  const checks = [
    'oauth2',
    'chat/completions',
    'apikey',
    'get',
    'post',
  ];
  const missing = checks.filter(c => !fullOutput.includes(c));
  if (missing.length === 0) {
    console.log(`  ✓ All key content preserved`);
    passed++;
  } else {
    console.log(`  ✗ Missing content: ${missing.join(', ')}`);
    failed++;
  }

  // Summary
  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
