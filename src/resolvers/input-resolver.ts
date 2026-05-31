import { InputDescriptor, SourceType, EXTENSION_MAP } from '../types/index.js';
import { existsSync, statSync } from 'fs';
import { resolve, extname } from 'path';

const GITHUB_PATTERN = /^https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/;
const URL_PATTERN = /^https?:\/\//;

export function resolveInput(input: string): InputDescriptor {
  // Check if it's a GitHub URL
  const githubMatch = input.match(GITHUB_PATTERN);
  if (githubMatch) {
    return {
      type: 'github',
      repoUrl: input,
    };
  }

  // Check if it's a URL
  if (URL_PATTERN.test(input)) {
    return {
      type: 'url',
      url: input,
    };
  }

  // Check if it's a local path
  const resolvedPath = resolve(input);
  if (existsSync(resolvedPath)) {
    const stats = statSync(resolvedPath);
    if (stats.isDirectory()) {
      return {
        type: 'directory',
        path: resolvedPath,
      };
    }
    if (stats.isFile()) {
      const ext = extname(resolvedPath).toLowerCase();
      return {
        type: 'file',
        path: resolvedPath,
        extension: EXTENSION_MAP[ext] || 'unknown',
      };
    }
  }

  // Try with cwd prefix
  const cwdPath = resolve(process.cwd(), input);
  if (existsSync(cwdPath)) {
    const stats = statSync(cwdPath);
    if (stats.isDirectory()) {
      return {
        type: 'directory',
        path: cwdPath,
      };
    }
    if (stats.isFile()) {
      const ext = extname(cwdPath).toLowerCase();
      return {
        type: 'file',
        path: cwdPath,
        extension: EXTENSION_MAP[ext] || 'unknown',
      };
    }
  }

  return {
    type: 'file',
    path: resolvedPath,
    extension: 'unknown',
  };
}

export function detectSourceType(input: string): SourceType {
  const desc = resolveInput(input);
  if (desc.type === 'url') return 'url';
  if (desc.type === 'github') return 'github';
  if (desc.type === 'directory') return 'directory';
  return (desc.extension as SourceType) || 'unknown';
}
