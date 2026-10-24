#!/usr/bin/env node
import 'dotenv/config';
import { runBackup } from '../services/backup/index.js';
import { humanBytes } from '../services/backup/hash.js';
import { describeBackupConfig, loadBackupConfig } from '../services/backup/config.js';

function parseArgs(argv) {
  const args = { dryRun: false, keep: false, retention: true, accounts: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--keep') args.keep = true;
    else if (arg === '--no-retention') args.retention = false;
    else if (arg === '--account') args.accounts = String(argv[++i] || '').split(',').filter(Boolean);
    else if (arg.startsWith('--account=')) args.accounts = arg.split('=')[1].split(',').filter(Boolean);
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Usage: npm run backup -- [options]

Options:
  --dry-run         Create and verify the dump, but do not upload
  --keep            Keep the temporary archive (useful with --dry-run)
  --no-retention    Upload without deleting old backups
  --account=a,b     Upload only to these account ids (default: all)
  -h, --help        Show this help

Examples:
  npm run backup
  npm run backup:dry-run -- --keep
  npm run backup -- --account=primary
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const config = describeBackupConfig(loadBackupConfig());
  console.log('Google Drive database backup');
  console.log(`  project : ${config.projectName}`);
  console.log(`  accounts: ${config.accounts.map((a) => a.email || a.id).join(', ') || '(none)'}`);
  console.log(`  schedule: ${config.schedule} (${config.timezone})`);
  console.log(`  encrypt : ${config.encryptionEnabled ? 'yes' : 'no'}`);
  console.log('');

  const result = await runBackup({
    trigger: 'cli',
    dryRun: args.dryRun,
    keepTemp: args.keep,
    applyRetention: args.retention,
    accountIds: args.accounts,
    onLog: (line) => console.log(line),
  });

  console.log('');
  console.log(result.dryRun ? 'DRY RUN COMPLETE' : result.ok ? 'BACKUP OK' : 'BACKUP FAILED');
  console.log(`  file    : ${result.fileName}`);
  console.log(`  size    : ${humanBytes(result.sizeBytes)} (${result.sizeBytes} bytes)`);
  console.log(`  sha256  : ${result.sha256}`);
  console.log(`  tables  : ${result.tables}`);
  if (result.filePath) console.log(`  local   : ${result.filePath}`);

  for (const account of result.results || []) {
    if (account.ok) {
      console.log(
        `  ✅ ${account.accountEmail}: ${account.webViewLink || account.driveFileId} ` +
          `(${humanBytes(account.sizeBytes)}, ${account.durationMs} ms)`
      );
    } else {
      console.log(`  ❌ ${account.accountEmail || account.accountId}: ${account.error}`);
    }
  }

  process.exitCode = result.ok ? 0 : 1;
}

main().catch((err) => {
  console.error(`\nBackup failed: ${err.message}`);
  if (process.env.DEBUG_BACKUP) console.error(err);
  process.exitCode = 1;
});
