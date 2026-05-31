import { NormalizedContent, CompressedContext, CompressionMode } from '../types/index.js';
import { compress, formatOutput } from '../compressors/index.js';

export interface BuildResult {
  content: string;
  context: CompressedContext;
  raw: NormalizedContent;
}

export function buildContext(
  normalized: NormalizedContent,
  mode: CompressionMode = 'balanced'
): BuildResult {
  const context = compress(normalized, mode);
  const content = formatOutput(context);
  
  return {
    content,
    context,
    raw: normalized,
  };
}

export function summarize(result: BuildResult): string {
  const { context, content } = result;
  
  const sections = context.sections.map(s => s.title).join(', ');
  
  return [
    `[SHIPRESSURE]`,
    `Project: ${context.project}`,
    `Sections: ${context.sections.length}`,
    `Tokens: ~${context.tokenEstimate}`,
    `Compression: ${context.compressionRatio}%`,
    `Output: ${content.length} chars`,
    `[/SHIPRESSURE]`,
  ].join('\n');
}
