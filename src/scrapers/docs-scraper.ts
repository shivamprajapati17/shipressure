import { NormalizedContent, Section, CodeBlock } from '../types/index.js';

const USER_AGENT = 'Shipressure/1.0 AI Context Compression';

interface ScrapedPage {
  url: string;
  title: string;
  content: string;
}

export async function scrapeDocsSite(url: string): Promise<NormalizedContent> {
  try {
    const platform = detectPlatform(url);
    const baseUrl = new URL(url);
    
    // Try to discover sitemap
    const pages = await discoverPages(url, platform, baseUrl);
    
    const sections: Section[] = [];
    const codeBlocks: CodeBlock[] = [];

    for (const page of pages) {
      const pageContent = await fetchPageContent(page.url);
      if (!pageContent) continue;

      const { sections: pageSections, codeBlocks: pageCode } = extractContent(pageContent, page.title);
      sections.push(...pageSections);
      codeBlocks.push(...pageCode);
    }

    return {
      title: `Documentation: ${baseUrl.hostname}`,
      sections: sections.slice(0, 200), // Limit size
      tables: [],
      codeBlocks: codeBlocks.slice(0, 100),
      metadata: {
        'Platform': platform,
        'URL': url,
        'Pages Crawled': String(pages.length),
        'Host': baseUrl.hostname,
      },
    };
  } catch (err) {
    return {
      title: `Documentation: ${url}`,
      sections: [{ heading: 'Error', level: 1, content: `Failed to scrape docs: ${err}` }],
      tables: [],
      codeBlocks: [],
      metadata: { 'Error': String(err) },
    };
  }
}

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('gitbook')) return 'GitBook';
  if (u.includes('mintlify')) return 'Mintlify';
  if (u.includes('docusaurus') || u.includes('/docs/') || u.includes('readme.com')) return 'Docusaurus/Readme';
  return 'Generic';
}

async function discoverPages(url: string, _platform: string, baseUrl: URL): Promise<ScrapedPage[]> {
  const pages: ScrapedPage[] = [];
  
  // Try sitemap.xml first
  const sitemapUrls = [
    new URL('/sitemap.xml', baseUrl).href,
    new URL('/sitemap_index.xml', baseUrl).href,
    new URL('/docs-sitemap.xml', baseUrl).href,
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const urls = await fetchSitemap(sitemapUrl);
      if (urls.length > 0) {
        for (const u of urls.slice(0, 50)) { // Max 50 pages
          pages.push({ url: u, title: u.split('/').pop()?.replace(/-/g, ' ') || u, content: '' });
        }
        return pages;
      }
    } catch {
      // Sitemap not found, continue
    }
  }

  // Fallback: just return the main URL
  pages.push({ url, title: url.split('/').pop()?.replace(/-/g, ' ') || 'Docs', content: '' });
  return pages;
}

async function fetchSitemap(url: string): Promise<string[]> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(5000),
  });
  
  if (!response.ok) return [];
  
  const xml = await response.text();
  const urls: string[] = [];
  
  // Simple XML parsing for sitemap
  const locRegex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  
  return urls;
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    return extractTextFromHtml(html);
  } catch {
    return null;
  }
}

function extractTextFromHtml(html: string): string {
  // Remove scripts, styles, navigation, footer
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  
  // Extract title
  const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
  
  // Convert HTML to readable text
  text = text
    .replace(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi, '\n### $1\n')
    .replace(/<p[^>]*>([^<]*)<\/p>/gi, '$1\n')
    .replace(/<li[^>]*>([^<]*)<\/li>/gi, '- $1\n')
    .replace(/<code[^>]*>([^<]+)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return text;
}

function extractContent(htmlText: string, pageTitle: string): { sections: Section[]; codeBlocks: CodeBlock[] } {
  const sections: Section[] = [];
  const codeBlocks: CodeBlock[] = [];
  
  // Add page title as section
  sections.push({
    heading: pageTitle,
    level: 1,
    content: '',
  });

  const lines = htmlText.split('\n');
  let currentSection: Section | null = null;
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Code blocks (``` markers)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        codeBlocks.push({ language: codeLanguage, code: codeContent.join('\n') });
        codeContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        heading: headingMatch[1],
        level: headingMatch[0].startsWith('###') ? 3 : headingMatch[0].startsWith('##') ? 2 : 1,
        content: '',
      };
      continue;
    }

    if (trimmed) {
      if (currentSection) {
        currentSection.content += trimmed + '\n';
      } else {
        sections.push({
          heading: 'Content',
          level: 1,
          content: trimmed + '\n',
        });
      }
    }
  }

  if (currentSection) sections.push(currentSection);

  return { sections, codeBlocks };
}

export async function scrapeUrl(url: string): Promise<NormalizedContent> {
  try {
    const content = await fetchPageContent(url);
    if (!content) {
      return {
        title: `URL: ${url}`,
        sections: [{ heading: 'Content', level: 1, content: 'Failed to fetch URL content' }],
        tables: [],
        codeBlocks: [],
        metadata: { 'URL': url },
      };
    }

    const { sections, codeBlocks } = extractContent(content, url);

    return {
      title: `URL Content: ${new URL(url).hostname}`,
      sections,
      tables: [],
      codeBlocks,
      metadata: { 'URL': url },
    };
  } catch (err) {
    return {
      title: `URL: ${url}`,
      sections: [{ heading: 'Error', level: 1, content: `Failed to fetch: ${err}` }],
      tables: [],
      codeBlocks: [],
      metadata: { 'Error': String(err) },
    };
  }
}
