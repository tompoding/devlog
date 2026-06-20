import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// Load environment variables from .env if process.loadEnvFile is available
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {
    // Abaikan jika .env tidak ditemukan
  }
}

/**
 * Membaca konfigurasi MCP server dari .mcp/config.json.
 * @param {string} serverName - Nama server MCP (contoh: "github").
 * @returns {Promise<object|null>} Konfigurasi server atau null jika tidak ada.
 */
async function loadMcpServerConfig(serverName) {
  const configPath = path.join(PROJECT_ROOT, '.mcp', 'config.json');
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(data);
    const serverConfig = parsed?.mcpServers?.[serverName];
    if (serverConfig) {
      const token = process.env.GITHUB_TOKEN || '';
      const user = process.env.USER || '';
      
      const env = {};
      if (serverConfig.env) {
        for (const [key, value] of Object.entries(serverConfig.env)) {
          env[key] = value
            .replace(/\${GITHUB_TOKEN}/g, token)
            .replace(/\${USER}/g, user);
        }
      }
      
      const args = (serverConfig.args || []).map(arg => 
        arg.replace(/\${GITHUB_TOKEN}/g, token).replace(/\${USER}/g, user)
      );
      
      return {
        command: serverConfig.command,
        args,
        env: {
          ...process.env,
          ...env
        }
      };
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[WARN] Gagal membaca konfigurasi MCP server ${serverName}:`, error.message);
    }
  }
  return null;
}

/**
 * Mendapatkan informasi owner dan repo dari git config lokal.
 * @returns {Promise<{owner: string, repo: string}>} Owner dan repo name.
 */
export async function getGitRepoInfo() {
  try {
    const configPath = path.join(PROJECT_ROOT, '.git', 'config');
    const content = await fs.readFile(configPath, 'utf-8');
    const match = content.match(/url\s*=\s*(?:https:\/\/github\.com\/|git@github\.com:)([^/]+)\/([^/.]+)(?:\.git)?/);
    if (match) {
      return {
        owner: match[1].trim(),
        repo: match[2].trim()
      };
    }
  } catch (error) {
    // Abaikan error
  }
  
  return {
    owner: process.env.GITHUB_USERNAME || '',
    repo: 'devlog' // default fallback
  };
}

/**
 * Mengonversi tanggal UTC ke string tanggal lokal YYYY-MM-DD.
 * @param {string} dateIsoString - Tanggal dalam format ISO.
 * @returns {string} Tanggal lokal dalam format YYYY-MM-DD.
 */
function getLocalDateString(dateIsoString) {
  const date = new Date(dateIsoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
}

/**
 * Mendapatkan string tanggal hari ini di zona waktu lokal (YYYY-MM-DD).
 * @returns {string} Tanggal hari ini.
 */
function getTodayDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
}

/**
 * Mengambil n commit terakhir dari repository GitHub menggunakan GitHub MCP Server.
 * @param {string} owner - Owner repository.
 * @param {string} repo - Nama repository.
 * @param {number} [limit=5] - Jumlah maksimal commit yang diambil.
 * @returns {Promise<Array>} Daftar commit.
 */
export async function getLastCommits(owner, repo, limit = 5) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('[WARN] GITHUB_TOKEN tidak diset di .env.');
    return [];
  }

  const mcpConfig = await loadMcpServerConfig('github');
  
  let transport;
  if (mcpConfig) {
    transport = new StdioClientTransport({
      command: mcpConfig.command,
      args: mcpConfig.args,
      env: mcpConfig.env
    });
  } else {
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        ...process.env,
        GITHUB_PERSONAL_ACCESS_TOKEN: token
      }
    });
  }

  const client = new Client(
    { name: 'devlog-client', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: 'list_commits',
      arguments: { owner, repo, perPage: limit }
    });

    if (!result || !result.content || result.content.length === 0) {
      return [];
    }

    const commitsData = JSON.parse(result.content[0].text);
    return commitsData.slice(0, limit).map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date
    }));
  } catch (error) {
    console.error(`[ERROR] Gagal mengambil commit dari ${owner}/${repo}:`, error.message);
    return [];
  } finally {
    try {
      await client.close();
    } catch (e) {
      // Abaikan error saat close
    }
  }
}

/**
 * Mengambil commit hari ini dari repository GitHub menggunakan GitHub MCP Server.
 * @param {string} owner - Owner repository.
 * @param {string} repo - Nama repository.
 * @returns {Promise<Array>} Daftar commit hari ini.
 */
export async function getTodayCommits(owner, repo) {
  const commits = await getLastCommits(owner, repo, 30);
  const today = getTodayDateString();
  return commits.filter(c => {
    const commitDate = getLocalDateString(c.date);
    return commitDate === today;
  });
}
