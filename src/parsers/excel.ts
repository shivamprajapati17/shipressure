import { NormalizedContent, Table } from '../types/index.js';
import { readFile } from 'fs/promises';

export async function parseExcel(filePath: string): Promise<NormalizedContent> {
  try {
    const XLSX = await import('xlsx');
    const dataBuffer = await readFile(filePath);
    const workbook = XLSX.read(dataBuffer, { type: 'buffer' });
    
    const sections: import('../types/index.js').Section[] = [];
    const tables: Table[] = [];
    const sheetNames = workbook.SheetNames;

    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) continue;

      const headers = jsonData[0].map(h => String(h ?? ''));
      const rows = jsonData.slice(1).map(row => 
        row.map(cell => String(cell ?? ''))
      ).filter(r => r.some(c => c.trim()));

      tables.push({ headers, rows, caption: sheetName });

      // Also add as section content
      let tableStr = `Sheet: ${sheetName}\n`;
      tableStr += `| ${headers.join(' | ')} |\n`;
      for (const row of rows) {
        tableStr += `| ${row.join(' | ')} |\n`;
      }

      sections.push({
        heading: `Sheet: ${sheetName}`,
        level: 1,
        content: tableStr,
      });
    }

    return {
      title: filePath.split(/[/\\]/).pop()?.replace(/\.(xlsx|xls)$/i, '') || 'Untitled Spreadsheet',
      sections,
      tables,
      codeBlocks: [],
      metadata: {
        'Sheets': sheetNames.join(', '),
        'Total Sheets': String(sheetNames.length),
      },
    };
  } catch (err) {
    return {
      title: filePath.split(/[/\\]/).pop() || 'Spreadsheet',
      sections: [{ heading: 'Error', level: 1, content: `Failed to parse spreadsheet: ${err}` }],
      tables: [],
      codeBlocks: [],
      metadata: { 'Error': String(err) },
    };
  }
}
