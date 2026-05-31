import { NormalizedContent, Section, CodeBlock } from '../types/index.js';

const GITHUB_API = 'https://api.github.com';
const RAW_CONTENT = 'https://raw.githubusercontent.com';
const USER_AGENT = 'Shipressure/1.0 AI Context Compression';

// Files to analyze (ignore node_modules, build outputs, lock files, etc.)
const IMPORTANT_FILES = [
  'README.md', 'readme.md', 'Readme.md',
  'CONTRIBUTING.md', 'contributing.md',
  'CHANGELOG.md', 'changelog.md',
  'LICENSE', 'license.txt',
  'package.json', 'tsconfig.json', 'Cargo.toml', 'go.mod', 'Gemfile',
  'Makefile', 'Dockerfile', 'docker-compose.yml',
  '.env.example', '.gitignore', '.eslintrc.js', '.prettierrc',
  'docs/', 'doc/', 'documentation/', 'wiki/',
];

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.sol',
  '.rb', '.java', '.cpp', '.c', '.h', '.cs', '.swift', '.kt',
  '.scala', '.php', '.vue', '.svelte', '.astro',
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'target', 'vendor', '.idea', '.vscode', 'coverage',
  '__pycache__', '.svelte-kit', '.vercel', '.netlify',
  'out', '.parcel-cache', '.cache', 'tmp', 'temp',
]);

interface RepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

export async function analyzeGitHub(repoUrl: string): Promise<NormalizedContent> {
  try {
    const repoInfo = parseRepoUrl(repoUrl);
    const sections: Section[] = [];
    const codeBlocks: CodeBlock[] = [];

    // Fetch README
    const readme = await fetchReadme(repoInfo);
    if (readme) {
      sections.push({
        heading: 'README',
        level: 1,
        content: readme,
      });
    }

    // Fetch repo metadata
    const metadata = await fetchRepoMetadata(repoInfo);
    
    // Fetch source structure
    const structure = await fetchRepoStructure(repoInfo);
    
    sections.push({
      heading: 'Repository Structure',
      level: 1,
      content: formatStructureTree(structure),
    });

    // Fetch important config files
    for (const fileName of IMPORTANT_FILES) {
      if (fileName.endsWith('/')) continue; // Skip directories
      const content = await fetchFile(repoInfo, fileName);
      if (content) {
        sections.push({
          heading: `Config: ${fileName}`,
          level: 2,
          content: content,
        });
        codeBlocks.push({ language: detectLanguage(fileName), code: content, filePath: fileName });
      }
    }

    // Fetch key source files (max 10)
    const sourceFiles = structure.filter(f => {
      const ext = f.name.split('.').pop();
      return ext && CODE_EXTENSIONS.has('.' + ext) && 
        !f.name.includes('test') && !f.name.includes('spec') &&
        !f.name.includes('min.') && !f.name.includes('.d.ts');
    }).slice(0, 10);

    for (const file of sourceFiles) {
      const content = await fetchFile(repoInfo, file.path);
      if (content) {
        const ext = file.name.split('.').pop() || '';
        codeBlocks.push({
          language: ext,
          code: content.slice(0, 3000), // Limit per file
          filePath: file.path,
        });
      }
    }

    return {
      title: `${repoInfo.owner}/${repoInfo.repo}`,
      sections,
      tables: [],
      codeBlocks: codeBlocks.slice(0, 30),
      metadata: {
        'Repository': `${repoInfo.owner}/${repoInfo.repo}`,
        'URL': repoUrl,
        'Description': String(metadata?.description ?? ''),
        'Language': String(metadata?.language ?? ''),
        'Stars': String(metadata?.stargazers_count ?? ''),
        'Topics': String((metadata?.topics as string[] | undefined)?.join(', ') ?? ''),
      },
    };
  } catch (err) {
    return {
      title: `GitHub: ${repoUrl}`,
      sections: [{ heading: 'Error', level: 1, content: `Failed to analyze repository: ${err}` }],
      tables: [],
      codeBlocks: [],
      metadata: { 'Error': String(err) },
    };
  }
}

function parseRepoUrl(url: string): RepoInfo {
  const match = url.replace(/\.git$/, '').match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\/|$|#)/);
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  return { owner: match[1], repo: match[2], branch: 'main' };
}

async function fetchRepoMetadata(info: RepoInfo): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${GITHUB_API}/repos/${info.owner}/${info.repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return (await response.json()) as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchReadme(info: RepoInfo): Promise<string | null> {
  try {
    const response = await fetch(
      `${RAW_CONTENT}/${info.owner}/${info.repo}/${info.branch || 'main'}/README.md`,
      {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch {
    return null;
  }
}

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

async function fetchRepoStructure(info: RepoInfo, path: string = ''): Promise<FileEntry[]> {
  try {
    const apiUrl = `${GITHUB_API}/repos/${info.owner}/${info.repo}/contents/${path}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return [];

    const items = (await response.json()) as Array<{ name: string; type: string; path: string }>;
    const entries: FileEntry[] = [];

    for (const item of items) {
      if (item.type === 'dir') {
        if (!IGNORE_DIRS.has(item.name)) {
          entries.push({ name: item.name + '/', path: item.path, type: 'dir' });
          const children = await fetchRepoStructure(info, item.path);
          entries.push(...children);
        }
      } else {
        const ext = '.' + item.name.split('.').pop()?.toLowerCase();
        if (CODE_EXTENSIONS.has(ext) || IMPORTANT_FILES.includes(item.name)) {
          entries.push({ name: item.name, path: item.path, type: 'file' });
        }
      }
    }

    return entries;
  } catch {
    return [];
  }
}

async function fetchFile(info: RepoInfo, filePath: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${RAW_CONTENT}/${info.owner}/${info.repo}/${info.branch || 'main'}/${filePath}`,
      {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch {
    return null;
  }
}

function formatStructureTree(entries: FileEntry[]): string {
  if (entries.length === 0) return '(could not fetch structure)';
  
  const tree = entries.map(e => {
    if (e.type === 'dir') return `📁 ${e.name}`;
    return `📄 ${e.name}`;
  }).join('\n');
  
  return `${entries.length} files/directories\n\n${tree}`;
}

function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'tsx',
    'js': 'javascript',
    'jsx': 'jsx',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'sol': 'solidity',
    'rb': 'ruby',
    'java': 'java',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'md': 'markdown',
    'css': 'css',
    'scss': 'scss',
  };
  return langMap[ext] || '';
}
