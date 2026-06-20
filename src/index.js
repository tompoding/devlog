#!/usr/bin/env node

import { Command } from 'commander';
import { addEntry, getTodayEntries, hasEntry } from './journal.js';
import { generateDailyReport } from './report.js';
import { getGitRepoInfo, getTodayCommits } from './github.js';

const program = new Command();

program
  .name('devlog')
  .description('Personal Dev Journal CLI')
  .version('1.0.0');

/**
 * Handler untuk command 'log'.
 * @param {string} message - Pesan aktivitas.
 */
async function handleLog(message) {
  try {
    const entryLine = await addEntry(message);
    console.log(`[SUKSES] Entri dicatat: "${entryLine}"`);
  } catch (error) {
    console.error('[ERROR] Gagal menulis entri:', error.message);
    process.exit(1);
  }
}

/**
 * Handler untuk command 'status'.
 */
async function handleStatus() {
  try {
    const entries = await getTodayEntries();
    console.log(`=== Jurnal Hari Ini ===`);
    if (entries.length === 0) {
      console.log('(Tidak ada entri untuk hari ini)');
    } else {
      entries.forEach((entry, idx) => {
        console.log(`${idx + 1}. ${entry}`);
      });
    }
  } catch (error) {
    console.error('[ERROR] Gagal membaca entri:', error.message);
    process.exit(1);
  }
}

/**
 * Handler untuk command 'report'.
 */
async function handleReport() {
  try {
    const reportPath = await generateDailyReport();
    console.log(`[SUKSES] Laporan berhasil dibuat di: ${reportPath}`);
  } catch (error) {
    console.error('[ERROR] Gagal membuat laporan:', error.message);
    process.exit(1);
  }
}

/**
 * Handler untuk command 'sync' yang menarik commit hari ini dari GitHub.
 * Commit yang sudah ada di jurnal (berdasarkan SHA) akan dilewati.
 */
async function handleSync() {
  try {
    const { owner, repo } = await getGitRepoInfo();
    console.log(`[INFO] Menarik commit hari ini dari GitHub repository ${owner}/${repo}...`);
    const commits = await getTodayCommits(owner, repo);
    
    if (commits.length === 0) {
      console.log('[INFO] Tidak ada commit baru yang ditemukan hari ini di GitHub.');
      return;
    }
    
    console.log(`[INFO] Menemukan ${commits.length} commit hari ini. Memeriksa duplikasi...`);
    let added = 0;
    let skipped = 0;
    // Menggunakan loop biasa untuk menjaga urutan penulisan file
    for (const commit of commits) {
      const shortSha = commit.sha.substring(0, 7);
      const entryText = `[git] ${commit.message} (sha: ${shortSha})`;
      // Lewati jika SHA sudah ada di jurnal hari ini
      if (await hasEntry(shortSha)) {
        skipped++;
        continue;
      }
      await addEntry(entryText);
      added++;
    }
    if (added === 0) {
      console.log('[INFO] Semua commit sudah tersinkronisasi, tidak ada entri baru.');
    } else {
      console.log(`[SUKSES] Sinkronisasi berhasil! ${added} entri commit ditambahkan ke jurnal.${skipped > 0 ? ` (${skipped} sudah ada, dilewati)` : ''}`);
    }
  } catch (error) {
    console.error('[ERROR] Gagal menyinkronkan commit:', error.message);
    process.exit(1);
  }
}

program
  .command('log')
  .description('Tambah entri jurnal harian')
  .argument('<message>', 'Pesan aktivitas jurnal')
  .action(handleLog);

program
  .command('status')
  .description('Lihat entri jurnal untuk hari ini')
  .action(handleStatus);

program
  .command('report')
  .description('Generate laporan Markdown untuk hari ini')
  .action(handleReport);

program
  .command('sync')
  .description('Sinkronisasikan commit hari ini dari GitHub ke jurnal')
  .action(handleSync);

program.parse(process.argv);
