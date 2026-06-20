import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

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
 * Menghasilkan laporan Markdown untuk hari ini.
 * @returns {Promise<string>} Path file laporan Markdown.
 */
export async function generateDailyReport() {
  const today = getTodayDateString();
  const logsDir = process.env.LOGS_DIR || path.join(PROJECT_ROOT, 'logs');
  const reportPath = path.join(logsDir, `${today}.md`);
  
  // Pastikan file tersebut ada
  try {
    await fs.access(reportPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Jika belum ada entri, inisialisasi file kosong ber-header
      await fs.mkdir(logsDir, { recursive: true });
      await fs.writeFile(reportPath, `# DevLog - ${today}\n\n## Aktivitas Jurnal\n`, 'utf-8');
    } else {
      throw error;
    }
  }
  
  return reportPath;
}
