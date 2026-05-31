import { NormalizedContent } from '../types/index.js';
import { readFile } from 'fs/promises';

export async function parseDocx(filePath: string): Promise<NormalizedContent> {
  try {
    const mammoth = await import('mammoth');
    const dataBuffer = await readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    const text = result.value || '';

    const sections: import('../types/index.js').Section[] = [];
    const lines = text.split('\n').filter((l: string) => l.trim());

    let currentSection: import('../types/index.js').Section | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      // Detect headings
      if (
        (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && trimmed.length < 120) ||
        (trimmed.endsWith(':') && trimmed.length < 80) ||
        (trimmed.startsWith('#'))
      ) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          heading: trimmed.replace(/^#+\s*/, '').replace(/:$/, ''),
          level: trimmed.startsWith('##') ? 2 : trimmed.startsWith('#') ? 1 : 1,
          content: '',
        };
      } else if (currentSection) {
        currentSection.content += trimmed + '\n';
      } else {
        sections.push({
          heading: 'Content',
          level: 1,
          content: trimmed + '\n',
        });
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return {
      title: filePath.split(/[/\\]/).pop()?.replace(/\.docx$/i, '') || 'Untitled DOCX',
      sections,
      tables: [],
      codeBlocks: [],
      metadata: {},
    };
  } catch (err) {
    return {
      title: filePath.split(/[/\\]/).pop() || 'DOCX',
      sections: [{ heading: 'Error', level: 1, content: `Failed to parse DOCX: ${err}` }],
      tables: [],
      codeBlocks: [],
      metadata: { 'Error': String(err) },
    };
  }
}
