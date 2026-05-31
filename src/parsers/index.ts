import { NormalizedContent, SourceType } from '../types/index.js';
import { parsePdf } from './pdf.js';
import { parseDocx } from './docx.js';
import { parseExcel } from './excel.js';
import { parseCsv } from './csv.js';
import { parseMarkdown } from './markdown.js';
import { parsePptx } from './pptx.js';

export async function parseFile(filePath: string, extension: SourceType): Promise<NormalizedContent> {
  switch (extension) {
    case 'pdf':
      return parsePdf(filePath);
    case 'docx':
      return parseDocx(filePath);
    case 'xlsx':
    case 'xls':
    case 'ods':
      return parseExcel(filePath);
    case 'csv':
      return parseCsv(filePath);
    case 'md':
    case 'txt':
    case 'rtf':
      return parseMarkdown(filePath);
    case 'pptx':
    case 'ppt':
      return parsePptx(filePath);
    default:
      // Try as text
      try {
        return parseMarkdown(filePath);
      } catch {
        return {
          title: filePath.split(/[/\\]/).pop() || 'Unknown',
          sections: [{ heading: 'Raw', level: 1, content: `Unsupported file type: ${extension}` }],
          tables: [],
          codeBlocks: [],
          metadata: {},
        };
      }
  }
}

export { parsePdf } from './pdf.js';
export { parseDocx } from './docx.js';
export { parseExcel } from './excel.js';
export { parseCsv } from './csv.js';
export { parseMarkdown, parseMarkdownContent } from './markdown.js';
export { parsePptx } from './pptx.js';
