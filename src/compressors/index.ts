import { NormalizedContent, CompressedContext, CompressionMode } from '../types/index.js';
import { isNoise } from '../normalizers/index.js';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function compress(
  content: NormalizedContent,
  mode: CompressionMode = 'balanced'
): CompressedContext {
  const originalText = serializeFull(content);
  const originalTokens = estimateTokens(originalText);

  const compressed: CompressedContext = {
    project: content.title,
    sections: [],
    metadata: content.metadata,
    tokenEstimate: 0,
    compressionRatio: 1,
  };

  if (mode === 'full') {
    // Full mode: preserve everything as-is, no noise removal, no limits
    compressed.sections = content.sections
      .filter(s => s.heading || s.content)
      .map(s => ({
        title: s.heading || 'Content',
        entries: s.content ? s.content.split('\n').filter(l => l.trim()) : [s.heading],
      }));
    
    // Include all code blocks
    if (content.codeBlocks.length > 0) {
      compressed.sections.push({
        title: 'CODE_BLOCKS',
        entries: content.codeBlocks.map(b => 
          `[${b.filePath || b.language || 'code'}]\n${b.code}`
        ),
      });
    }

    // Include all tables
    if (content.tables.length > 0) {
      compressed.sections.push({
        title: 'TABLES',
        entries: content.tables.map(t => {
          const caption = t.caption ? `[${t.caption}]` : '';
          const header = t.headers.join(' | ');
          const rows = t.rows.map(r => r.join(' | '));
          return [caption, header, ...rows].filter(Boolean).join('\n');
        }).filter(Boolean),
      });
    }
  } else {
    // Balanced or Ultra: apply compression pipeline
    
    // Stage 1: Remove noise lines
    const cleanedSections = content.sections.map(section => ({
      ...section,
      content: section.content.split('\n').filter(l => !isNoise(l)).join('\n').trim(),
    }));

    // Stage 2: Deduplicate
    const deduped = deduplicate(cleanedSections);

    // Stage 3: Condense based on mode
    const condensed = condense(deduped, mode);

    // Build compressed sections
    compressed.sections = condensed
      .filter(s => s.content || s.heading)
      .map(s => ({
        title: s.heading,
        entries: splitIntoEntries(s, mode),
      }))
      .filter(s => s.entries.length > 0);

    // Add code blocks (compressed)
    if (content.codeBlocks.length > 0) {
      const maxCode = mode === 'ultra' ? 20 : 50;
      compressed.sections.push({
        title: 'CODE_BLOCKS',
        entries: content.codeBlocks.slice(0, maxCode).map(b => {
          const label = `[${b.filePath || b.language || 'code'}]`;
          return `${label}\n${condenseCode(b.code, mode)}`;
        }),
      });
    }

    // Add tables (compressed)
    if (content.tables.length > 0) {
      const maxTables = mode === 'ultra' ? 10 : 20;
      const maxRows = mode === 'ultra' ? 10 : 50;
      compressed.sections.push({
        title: 'TABLES',
        entries: content.tables.slice(0, maxTables).map(t => {
          const caption = t.caption ? `[${t.caption}]` : '';
          const header = t.headers.join(' | ');
          const rows = t.rows.slice(0, maxRows).map(r => r.join(' | '));
          return [caption, header, ...rows].filter(Boolean).join('\n');
        }),
      });
    }
  }

  const compressedText = serializeCompressed(compressed);
  compressed.tokenEstimate = estimateTokens(compressedText);
  compressed.compressionRatio = originalTokens > 0
    ? Math.round((1 - compressed.tokenEstimate / originalTokens) * 10000) / 100
    : 0;

  return compressed;
}

/** Serialize ALL content for baseline token count */
function serializeFull(content: NormalizedContent): string {
  let text = `PROJECT: ${content.title}\n`;
  for (const s of content.sections) {
    text += `\n${s.heading}\n`;
    if (s.content) text += s.content + '\n';
  }
  if (content.codeBlocks.length > 0) {
    text += '\nCODE_BLOCKS\n';
    for (const b of content.codeBlocks) {
      text += `[${b.filePath || b.language || 'code'}]\n${b.code}\n`;
    }
  }
  if (content.tables.length > 0) {
    text += '\nTABLES\n';
    for (const t of content.tables) {
      text += `[${t.caption || ''}]\n${t.headers.join(' | ')}\n`;
      for (const r of t.rows) text += r.join(' | ') + '\n';
    }
  }
  return text;
}

function serializeCompressed(context: CompressedContext): string {
  let text = `PROJECT: ${context.project}\n`;
  for (const section of context.sections) {
    text += `\n${section.title}\n`;
    for (const entry of section.entries) {
      text += entry + '\n';
    }
  }
  return text;
}

function deduplicate(sections: import('../types/index.js').Section[]): import('../types/index.js').Section[] {
  const seen = new Set<string>();
  return sections.map(s => {
    const lines = s.content.split('\n').filter(l => {
      const key = l.trim().toLowerCase();
      if (seen.has(key) && key.length > 20) return false;
      seen.add(key);
      return true;
    });
    return { ...s, content: lines.join('\n') };
  });
}

function condense(
  sections: import('../types/index.js').Section[],
  mode: CompressionMode
): import('../types/index.js').Section[] {
  return sections.map(s => ({ ...s, content: condenseText(s.content, mode) }));
}

function condenseText(text: string, mode: CompressionMode): string {
  const lines = text.split('\n').filter(l => l.trim());

  if (mode === 'ultra') {
    return lines.map(l =>
      l
        .replace(/^(?:the|a|an)\s+/i, '')
        .replace(/^(?:this|that|these|those)\s+/, '')
        .replace(/\s+that\s+is\s+/g, ' → ')
        .replace(/\s+which\s+(?:is|are|was|were)\s+/g, ' → ')
        .replace(/\s+in\s+order\s+to\s+/g, ' → ')
        .replace(/\s+as\s+well\s+as\s+/g, ', ')
        .replace(/,\s*however,/g, '')
        .replace(/,\s*therefore,/g, ' → ')
        .replace(/,\s*for\s+example,/g, ' e.g.')
        .replace(/,\s*such\s+as\s+/g, ' → ')
        .replace(/\s+please\s+/g, ' ')
        .replace(/\s+kindly\s+/g, ' ')
        .replace(/\s+note\s+that\s+/g, ' ')
        .replace(/\s+it\s+is\s+(?:important|worth\s+noting)\s+that\s+/g, ' ')
        .replace(/\s+in\s+order\s+to\s+/g, ' → ')
        .replace(/\s+utilize\s+/g, ' use ')
        .replace(/\s+implement\s+/g, ' build ')
        .replace(/\s+leverage\s+/g, ' use ')
        .replace(/\s+facilitate\s+/g, ' help ')
        .trim()
    ).join('\n');
  }

  // Balanced mode
  return lines.map(l =>
    l
      .replace(/\s+please\s+/g, ' ')
      .replace(/\s+note\s+that\s+/g, ' ')
      .replace(/\s+it\s+is\s+(?:important|worth\s+noting)\s+that\s+/g, ' ')
      .replace(/\s+leverage\s+/g, ' use ')
      .replace(/\s+utilize\s+/g, ' use ')
      .trim()
  ).join('\n');
}

function condenseCode(code: string, mode: CompressionMode): string {
  const lines = code.split('\n');

  if (mode === 'ultra') {
    return lines
      .filter(l => {
        const t = l.trim();
        return t && !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*') && !t.startsWith('#');
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  return lines
    .filter(l => {
      const t = l.trim();
      return t && !t.startsWith('//');
    })
    .join('\n');
}

function splitIntoEntries(
  section: import('../types/index.js').Section,
  mode: CompressionMode
): string[] {
  const content = section.content;
  if (!content) return [section.heading];

  const maxEntries = mode === 'ultra' ? 5 : 15;
  const entries = content.split('\n').filter(l => l.trim()).slice(0, maxEntries);
  return entries.length > 0 ? entries : [content.slice(0, 200)];
}

export function formatOutput(context: CompressedContext): string {
  const lines: string[] = [];

  lines.push('[SHIPRESSURE]');
  lines.push('');
  lines.push(`PROJECT: ${context.project}`);
  lines.push('');

  for (const section of context.sections) {
    const sectionTitle = section.title.toUpperCase().replace(/\s+/g, '_');
    lines.push(sectionTitle);
    lines.push('');
    for (const entry of section.entries) {
      lines.push(entry);
    }
    lines.push('');
  }

  lines.push('[/SHIPRESSURE]');
  lines.push('');
  lines.push(`// ⚡ ~${context.tokenEstimate} tokens | ${context.compressionRatio}% compression`);

  return lines.join('\n');
}
