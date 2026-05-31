export { resolveInput, detectSourceType } from './resolvers/input-resolver.js';
export { parseFile, parseMarkdown, parseMarkdownContent, parsePdf, parseDocx, parseExcel, parseCsv, parsePptx } from './parsers/index.js';
export { scrapeSource, scrapeDocsSite, analyzeGitHub } from './scrapers/index.js';
export { normalize } from './normalizers/index.js';
export { compress, formatOutput } from './compressors/index.js';
export { buildContext, summarize } from './builders/index.js';
export * from './types/index.js';

/**
 * Shipressure - Universal AI Context Compression
 * 
 * Compress documents, repositories, websites into AI-ready context.
 * 
 * @example
 * ```typescript
 * import { shipressure } from 'shipressure';
 * 
 * const result = await shipressure('./api.pdf', { mode: 'balanced' });
 * console.log(result.content);
 * ```
 */
export async function shipressure(
  source: string,
  options: { mode?: 'full' | 'balanced' | 'ultra'; verbose?: boolean } = {}
): Promise<{ content: string; context: import('./types/index.js').CompressedContext }> {
  const { resolveInput } = await import('./resolvers/input-resolver.js');
  const { parseFile } = await import('./parsers/index.js');
  const { scrapeSource } = await import('./scrapers/index.js');
  const { normalize } = await import('./normalizers/index.js');
  const { buildContext } = await import('./builders/index.js');
  
  const input = resolveInput(source);
  
  let normalized;
  
  switch (input.type) {
    case 'file': {
      if (!input.path || !input.extension || input.extension === 'unknown') {
        throw new Error(`Unsupported file: ${source}`);
      }
      const parsed = await parseFile(input.path, input.extension as import('./types/index.js').SourceType);
      normalized = normalize(parsed);
      break;
    }
    
    case 'url': {
      if (!input.url) throw new Error('Invalid URL');
      const scraped = await scrapeSource(input.url);
      normalized = normalize(scraped);
      break;
    }
    
    case 'github': {
      if (!input.repoUrl) throw new Error('Invalid GitHub URL');
      const analyzed = await scrapeSource(input.repoUrl);
      normalized = normalize(analyzed);
      break;
    }
    
    case 'directory': {
      const { readdir } = await import('fs/promises');
      const { join, extname } = await import('path');
      const SUPPORTED_EXTS = new Set(['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.ods', '.pptx', '.ppt', '.md', '.txt', '.rtf']);
      
      if (!input.path) throw new Error('Invalid directory path');
      const entries = await readdir(input.path);
      
      const sections: import('./types/index.js').Section[] = [];
      const allCodeBlocks: import('./types/index.js').CodeBlock[] = [];
      const allTables: import('./types/index.js').Table[] = [];
      
      for (const file of entries) {
        const ext = extname(file).toLowerCase();
        if (!SUPPORTED_EXTS.has(ext)) continue;
        
        const filePath = join(input.path, file);
        try {
          const sourceExt = ext.slice(1) as import('./types/index.js').SourceType;
          const parsed = await parseFile(filePath, sourceExt);
          const n = normalize(parsed);
          sections.push(...n.sections);
          allCodeBlocks.push(...n.codeBlocks);
          allTables.push(...n.tables);
        } catch {
          // Skip files that fail
        }
      }
      
      normalized = {
        title: `Directory: ${input.path.split(/[/\\]/).pop() || 'root'}`,
        sections,
        tables: allTables,
        codeBlocks: allCodeBlocks,
        metadata: { 'Directory': input.path },
      };
      break;
    }
    
    default:
      throw new Error(`Unknown input type: ${input.type}`);
  }
  
  return buildContext(normalized, options.mode || 'balanced');
}
