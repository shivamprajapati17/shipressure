import { NormalizedContent, Section, Table, CodeBlock } from '../types/index.js';
import { readFile } from 'fs/promises';

export async function parsePdf(filePath: string): Promise<NormalizedContent> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const dataBuffer = await readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    const text = data.text || '';
    const sections: Section[] = [];
    const lines = text.split('\n').filter((l: string) => l.trim());
    
    let currentSection: Section | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Detect headings (all caps short lines, or lines ending with colon)
      if (
        (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && trimmed.length < 100) ||
        (trimmed.endsWith(':') && trimmed.length < 80)
      ) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          heading: trimmed.replace(/:$/, ''),
          level: 1,
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
      title: data.info?.Title || filePath.split(/[/\\]/).pop() || 'Untitled PDF',
      sections,
      tables: extractTablesFromText(text),
      codeBlocks: [],
      metadata: {
        'Pages': String(data.numpages || ''),
        'Author': data.info?.Author || '',
        'Title': data.info?.Title || '',
      },
    };
  } catch (err) {
    return {
      title: filePath.split(/[/\\]/).pop() || 'PDF',
      sections: [{ heading: 'Error', level: 1, content: `Failed to parse PDF: ${err}` }],
      tables: [],
      codeBlocks: [],
      metadata: { 'Error': String(err) },
    };
  }
}

function extractTablesFromText(text: string): Table[] {
  const tables: Table[] = [];
  const lines = text.split('\n').filter((l: string) => l.trim());
  
  // Simple table detection: consecutive lines with consistent pipe/space/column alignment
  let tableLines: string[] = [];
  for (const line of lines) {
    if (line.includes('|') || line.includes('\t')) {
      tableLines.push(line);
    } else if (tableLines.length >= 2) {
      const headers = tableLines[0].split(/[|\t]/).map((h: string) => h.trim()).filter(Boolean);
      const rows = tableLines.slice(1).map((l: string) => 
        l.split(/[|\t]/).map((c: string) => c.trim()).filter(Boolean)
      ).filter((r: string[]) => r.length > 0);
      if (headers.length > 0) {
        tables.push({ headers, rows });
      }
      tableLines = [];
    } else {
      tableLines = [];
    }
  }
  
  return tables;
}
