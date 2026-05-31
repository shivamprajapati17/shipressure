import { NormalizedContent, Section } from '../types/index.js';

export function normalize(content: NormalizedContent): NormalizedContent {
  const normalized: NormalizedContent = {
    title: content.title || 'Untitled',
    sections: normalizeSections(content.sections || []),
    tables: (content.tables || []).map(normalizeTable),
    codeBlocks: (content.codeBlocks || []).map(block => ({
      ...block,
      code: block.code?.trim() || '',
      language: block.language || '',
    })),
    metadata: content.metadata || {},
  };

  return normalized;
}

function normalizeSections(sections: Section[]): Section[] {
  return sections
    .filter(s => s.heading)
    .map(s => ({
      heading: s.heading.trim(),
      level: Math.min(Math.max(s.level || 1, 1), 6),
      content: normalizeText(s.content || ''),
      subsections: s.subsections ? normalizeSections(s.subsections) : undefined,
    }))
    .filter(s => s.content || (s.subsections && s.subsections.length > 0));
}

function normalizeText(text: string): string {
  return text
    // Remove zero-width chars
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Collapse multiple spaces
    .replace(/[ \t]+/g, ' ')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace per line
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .trim();
}

function normalizeTable(table: import('../types/index.js').Table): import('../types/index.js').Table {
  return {
    headers: (table.headers || []).map(h => String(h).trim()),
    rows: (table.rows || []).map(row =>
      row.map(cell => String(cell).trim())
    ),
    caption: table.caption,
  };
}

export function isNoise(line: string): boolean {
  const noisePatterns = [
    /^page\s*\d+$/i,
    /^copyright\s+\d{4}/i,
    /^all rights reserved/i,
    /^confidential/i,
    /^proprietary/i,
    /^terms\s+and\s+conditions/i,
    /^privacy\s+policy/i,
    /^\s*[-–—]\s*\d+\s*[-–—]\s*$/,
    /^\/\/.*$/,
    /^<!--.*-->$/,
    /^navigation/i,
    /^footer/i,
    /^sidebar/i,
    /^table\s+of\s+contents/i,
  ];
  return noisePatterns.some(p => p.test(line.trim()));
}
