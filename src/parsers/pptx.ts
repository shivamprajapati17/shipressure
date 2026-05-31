import { NormalizedContent } from '../types/index.js';
import { readFile } from 'fs/promises';

export async function parsePptx(filePath: string): Promise<NormalizedContent> {
  const fileName = filePath.split(/[/\\]/).pop() || 'Presentation';
  
  try {
    const data = await readFile(filePath);
    
    // Try to extract text by scanning the binary for readable strings
    // PPTX files are ZIP archives containing XML slides
    const text = data.toString('utf-8');
    
    // Extract text content between XML tags in the PPTX
    const sections: import('../types/index.js').Section[] = [];
    
    // Simple text extraction from the raw content
    const slideMatches = text.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
    if (slideMatches && slideMatches.length > 0) {
      const texts = slideMatches.map(m => {
        const content = m.replace(/<[^>]+>/g, '');
        return content.trim();
      }).filter(Boolean);

      if (texts.length > 0) {
        sections.push({
          heading: 'Slide Text Content',
          level: 1,
          content: texts.join('\n'),
        });
      }
    }

    // Try to get slide titles
    const titleMatches = text.match(/<a:ph[^>]*type="title"[^>]*>[\s\S]*?<\/a:ph>/g);
    if (titleMatches) {
      const titles = titleMatches.map(m => {
        const textMatch = m.match(/<a:t[^>]*>([^<]+)<\/a:t>/);
        return textMatch ? textMatch[1].trim() : '';
      }).filter(Boolean);
      
      if (titles.length > 0) {
        sections.unshift({
          heading: 'Slide Titles',
          level: 1,
          content: titles.map((t, i) => `Slide ${i + 1}: ${t}`).join('\n'),
        });
      }
    }

    if (sections.length === 0) {
      sections.push({
        heading: 'Presentation',
        level: 1,
        content: `PPTX file: ${fileName} (extracted ${data.length} bytes - use a dedicated PPTX tool for full content)`,
      });
    }

    return {
      title: fileName.replace(/\.pptx$/i, ''),
      sections,
      tables: [],
      codeBlocks: [],
      metadata: {
        'Format': 'PPTX',
        'Size': `${(data.length / 1024).toFixed(1)} KB`,
      },
    };
  } catch (err) {
    return {
      title: fileName.replace(/\.pptx$/i, ''),
      sections: [{
        heading: 'Content',
        level: 1,
        content: `PPTX file: ${fileName} (binary format)`,
      }],
      tables: [],
      codeBlocks: [],
      metadata: { 'Error': String(err) },
    };
  }
}
