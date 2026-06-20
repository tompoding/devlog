import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

/**
 * Mendapatkan path file log harian dalam format Markdown.
 * @param {string} dateString - Tanggal dalam format YYYY-MM-DD.
 * @returns {string} Path absolut file Markdown.
 */
function getDailyLogPath(dateString) {
  const logsDir = process.env.LOGS_DIR || path.join(PROJECT_ROOT, 'logs');
  return path.join(logsDir, `${dateString}.md`);
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
 * Menambahkan entri jurnal baru ke file Markdown harian.
 * @param {string} message - Pesan entri jurnal.
 * @returns {Promise<string>} Baris entri jurnal yang baru ditambahkan.
 */
export async function addEntry(message) {
  const today = getTodayDateString();
  const logPath = getDailyLogPath(today);
  const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const entryLine = `- **[${time}]** ${message}`;

  let content = '';
  try {
    content = await fs.readFile(logPath, 'utf-8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (!content) {
    content = `# DevLog - ${today}\n\n## Aktivitas Jurnal\n${entryLine}\n`;
  } else {
    const lines = content.split('\n');
    const journalHeaderIdx = lines.findIndex(line => line.trim() === '## Aktivitas Jurnal');
    
    if (journalHeaderIdx !== -1) {
      let insertIdx = journalHeaderIdx + 1;
      while (insertIdx < lines.length && lines[insertIdx].trim() !== '' && !lines[insertIdx].startsWith('#')) {
        insertIdx++;
      }
      lines.splice(insertIdx, 0, entryLine);
      content = lines.join('\n');
    } else {
      content += `\n${entryLine}\n`;
    }
  }

  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, content.trim() + '\n', 'utf-8');
  
  return entryLine;
}

/**
 * Membaca semua entri jurnal dari file Markdown hari ini.
 * @returns {Promise<Array<string>>} Daftar entri jurnal harian.
 */
export async function getTodayEntries() {
  const today = getTodayDateString();
  const logPath = getDailyLogPath(today);
  
  try {
    const content = await fs.readFile(logPath, 'utf-8');
    const lines = content.split('\n');
    const journalHeaderIdx = lines.findIndex(line => line.trim() === '## Aktivitas Jurnal');
    
    if (journalHeaderIdx === -1) {
      return [];
    }
    
    const entries = [];
    let idx = journalHeaderIdx + 1;
    while (idx < lines.length && !lines[idx].startsWith('##') && !lines[idx].startsWith('#')) {
      const line = lines[idx].trim();
      if (line.startsWith('- **[')) {
        entries.push(line);
      }
      idx++;
    }
    return entries;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
