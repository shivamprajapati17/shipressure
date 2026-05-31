export interface InputDescriptor {
  type: 'file' | 'directory' | 'url' | 'github';
  path?: string;
  url?: string;
  repoUrl?: string;
  extension?: string;
}

export interface NormalizedContent {
  title: string;
  sections: Section[];
  tables: Table[];
  codeBlocks: CodeBlock[];
  metadata: Record<string, string>;
}

export interface Section {
  heading: string;
  level: number;
  content: string;
  subsections?: Section[];
}

export interface Table {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface CodeBlock {
  language: string;
  code: string;
  filePath?: string;
}

export interface CompressedContext {
  project: string;
  sections: CompressedSection[];
  metadata: Record<string, string>;
  tokenEstimate: number;
  compressionRatio: number;
}

export interface CompressedSection {
  title: string;
  entries: string[];
}

export type CompressionMode = 'full' | 'balanced' | 'ultra';

export interface CliOptions {
  mode: CompressionMode;
  output?: string;
  verbose?: boolean;
}

export type SourceType = 'pdf' | 'docx' | 'xlsx' | 'xls' | 'csv' | 'ods' | 'pptx' | 'ppt' | 'md' | 'txt' | 'rtf' | 'url' | 'github' | 'directory' | 'unknown';

export const EXTENSION_MAP: Record<string, SourceType> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.xlsx': 'xlsx',
  '.xls': 'xls',
  '.csv': 'csv',
  '.ods': 'ods',
  '.pptx': 'pptx',
  '.ppt': 'ppt',
  '.md': 'md',
  '.txt': 'txt',
  '.rtf': 'rtf',
};
