import { NormalizedContent, Table } from '../types/index.js';
import { readFile } from 'fs/promises';

export async function parseCsv(filePath: string): Promise<NormalizedContent> {
  try {
    const { parse } = await import('csv-parse/sync');
    const data = await readFile(filePath, 'utf-8');
    const records: string[][] = parse(data, {
      skip_empty_lines: true,
      relax_column_count: true,
    });

    const tables: Table[] = [];
    if (records.length > 0) {
      const headers = records[0].map(h => String(h ?? ''));
      const rows = records.slice(1).map(row => 
        row.map(cell => String(cell ?? ''))
      ).filter(r => r.some(c => c.trim()));

      tables.push({ headers, rows, caption: filePath.split(/[/\\]/).pop() });
    }

    let content = '';
    if (tables.length > 0) {
      content += `| ${tables[0].headers.join(' | ')} |\n`;
      for (const row of tables[0].rows) {
        content += `| ${row.join(' | ')} |\n`;
      }
    }

    return {
      title: filePath.split(/[/\\]/).pop()?.replace(/\.csv$/i, '') || 'Untitled CSV',
      sections: [
        {
          heading: 'CSV Data',
          level: 1,
          content: content || '(empty CSV)',
        },
      ],
      tables,
      codeBlocks: [],
      metadata: {
        'Rows': String(records.length > 0 ? records.length - 1 : 0),
        'Columns': String(tables[0]?.headers.length ?? 0),
      },
    };
  } catch (err) {
    return {
      title: filePath.split(/[/\\]/).pop() || 'CSV',
      sections: [{ heading: 'Error', level: 1, content: `Failed to parse CSV: ${err}` }],
      tables: [],
      codeBlocks: [],
      metadata: { 'Error': String(err) },
    };
  }
}
