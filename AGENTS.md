# devlog — Personal Dev Journal CLI

## Tujuan proyek
CLI tool berbasis Node.js untuk mencatat aktivitas coding harian, 
menarik data commit dari GitHub, dan menghasilkan laporan Markdown otomatis.

## Stack
- Runtime: Node.js 22
- Language: JavaScript (ESM, bukan CommonJS)
- CLI framework: commander.js
- Output: Markdown files di folder ./logs/

## Struktur folder
```
devlog/
├── src/
│   ├── index.js       # entry point & CLI commands
│   ├── journal.js     # logika tulis/baca log
│   ├── github.js      # integrasi GitHub via MCP
│   └── report.js      # generate laporan Markdown
├── logs/              # output file log harian (gitignored)
├── .mcp/              # konfigurasi MCP servers
├── AGENTS.md          # file ini
└── package.json
```

## Konvensi kode
- Gunakan ESM (import/export), bukan require()
- Setiap fungsi harus punya JSDoc minimal 1 baris
- Nama file: kebab-case. Nama fungsi: camelCase
- Jangan hardcode path — gunakan path.join() dan process.env

## Larangan
- JANGAN install dependencies tanpa konfirmasi eksplisit
- JANGAN modifikasi file di folder logs/ secara langsung
- JANGAN commit file .env atau API key apapun

## Cara menjalankan
```bash
node src/index.js log "pesan jurnal"   # tambah entri
node src/index.js report               # generate laporan hari ini
node src/index.js status               # lihat entri hari ini
```

## Status saat ini
[x] Fase 1: CLI dasar dengan commander.js
[x] Fase 2: Integrasi GitHub MCP
[ ] Fase 3: Subagent untuk proses paralel
[ ] Fase 4: Scheduled nightly report
