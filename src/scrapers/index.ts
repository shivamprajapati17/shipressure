import { NormalizedContent } from '../types/index.js';
import { scrapeDocsSite, scrapeUrl } from './docs-scraper.js';
import { analyzeGitHub } from './github-analyzer.js';

export async function scrapeSource(url: string): Promise<NormalizedContent> {
  const u = url.toLowerCase();
  
  if (u.includes('github.com')) {
    return analyzeGitHub(url);
  }
  
  // Try as documentation site
  const docPlatforms = ['gitbook', 'mintlify', 'docusaurus', 'readme.com'];
  if (docPlatforms.some(p => u.includes(p)) || url.includes('/docs/')) {
    return scrapeDocsSite(url);
  }
  
  // Generic URL scrape
  return scrapeUrl(url);
}

export { scrapeDocsSite } from './docs-scraper.js';
export { analyzeGitHub } from './github-analyzer.js';
