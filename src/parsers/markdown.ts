import { NormalizedContent, Section, CodeBlock, Table } from '../types/index.js';
import { readFile } from 'fs/promises';

export async function parseMarkdown(filePath: string): Promise<NormalizedContent> {
  try {
    const data = await readFile(filePath, 'utf-8');
    return parseMarkdownContent(data, filePath);
  } catch (err) {
    return {
      title: filePath.split(/[/\\]/).pop() || 'Markdown',
      sections: [{ heading: 'Error', level: 1, content: `Failed to parse Markdown: ${err}` }],
      tables: [],
      codeBlocks: [],
      metadata: { 'Error': String(err) },
    };
  }
}

export function parseMarkdownContent(content: string, filePath?: string): NormalizedContent {
  const sections: Section[] = [];
  const codeBlocks: CodeBlock[] = [];
  const tables: Table[] = [];

  const lines = content.split('\n');
  let currentSection: Section | null = null;
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeContent: string[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];
  let tableLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        codeBlocks.push({
          language: codeLanguage,
          code: codeContent.join('\n'),
        });
        codeContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: headingMatch[2],
        level: headingMatch[1].length,
        content: '',
      };
      continue;
    }

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      
      // Skip separator rows (---|---|---)
      if (cells.every(c => /^[-:\s]+$/.test(c))) {
        inTable = true;
        continue;
      }

      if (inTable && tableLineCount === 0) {
        tableHeaders = cells;
        tableLineCount++;
      } else if (inTable) {
        tableRows.push(cells);
      } else {
        // Single table row without header - treat as first row
        tableHeaders = cells;
        inTable = true;
        tableLineCount = 1;
      }
      continue;
    } else if (inTable && trimmed === '') {
      // End of table
      if (tableHeaders.length > 0) {
        tables.push({ headers: tableHeaders, rows: tableRows });
      }
      tableHeaders = [];
      tableRows = [];
      tableLineCount = 0;
      inTable = false;
      continue;
    } else if (inTable && !trimmed.startsWith('|')) {
      if (tableHeaders.length > 0) {
        tables.push({ headers: tableHeaders, rows: tableRows });
      }
      tableHeaders = [];
      tableRows = [];
      tableLineCount = 0;
      inTable = false;
    }

    // Regular content
    if (currentSection) {
      currentSection.content += line + '\n';
    } else if (trimmed) {
      currentSection = {
        heading: 'Content',
        level: 1,
        content: line + '\n',
      };
    }
  }

  // Flush remaining
  if (currentSection) {
    sections.push(currentSection);
  }
  if (inCodeBlock) {
    codeBlocks.push({
      language: codeLanguage,
      code: codeContent.join('\n'),
    });
  }
  if (tableHeaders.length > 0) {
    tables.push({ headers: tableHeaders, rows: tableRows });
  }

  const title = filePath
    ? (filePath.split(/[/\\]/).pop()?.replace(/\.(md|mdx)$/i, '') || 'Untitled')
    : 'Untitled';

  return {
    title,
    sections,
    tables,
    codeBlocks,
    metadata: { 'Source': filePath || 'inline' },
  };
}
