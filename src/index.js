#!/usr/bin/env node

import { Command } from 'commander';
import { addEntry, getTodayEntries } from './journal.js';
import { generateDailyReport } from './report.js';

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

program.parse(process.argv);
