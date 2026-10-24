#!/usr/bin/env node
import 'dotenv/config';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { OAuth2Client } from 'google-auth-library';
import { loadBackupConfig } from '../services/backup/config.js';
import { DRIVE_SCOPES, ensureBackupFolder, getAccountIdentity } from '../services/backup/drive.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--account') args.account = argv[++i];
    else if (arg.startsWith('--account=')) args.account = arg.split('=')[1];
    else if (arg === '--email') args.email = argv[++i];
    else if (arg.startsWith('--email=')) args.email = arg.split('=')[1];
    else if (arg === '--client-id') args.clientId = argv[++i];
    else if (arg.startsWith('--client-id=')) args.clientId = arg.split('=')[1];
    else if (arg === '--client-secret') args.clientSecret = argv[++i];
    else if (arg.startsWith('--client-secret=')) args.clientSecret = arg.split('=')[1];
    else if (arg === '--manual') args.manual = true;
    else if (arg === '--no-browser') args.noBrowser = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Usage: npm run backup:auth -- [options]

Generates a Google Drive refresh token for one backup account.

Options:
  --account=primary     Account id from GOOGLE_DRIVE_ACCOUNTS (default: "default")
  --email=you@gmail.com Google account that owns the backup Drive
  --client-id=...       OAuth client id (otherwise GOOGLE_DRIVE_CLIENT_ID)
  --client-secret=...   OAuth client secret (otherwise GOOGLE_DRIVE_CLIENT_SECRET)
  --manual              Do not open a browser; paste the code instead
  --no-browser          Print the URL without trying to open a browser
  -h, --help            Show this help

Before running:
  1. Enable the Google Drive API in Google Cloud Console
  2. Create an OAuth Client ID of type "Desktop app"
  3. Set the OAuth consent screen publishing status to "In production"
     (tokens created in "Testing" mode expire after 7 days)
`);
}

function extractCode(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const url = new URL(input);
    return url.searchParams.get('code') || input;
  } catch {
    return input;
  }
}

function openBrowser(url) {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    const child = spawn(command, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' });
    child.on('error', () => {});
    child.unref();
  } catch {
    // The URL is printed anyway.
  }
}

function waitForRedirect(port, timeoutMs = 5 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${port}`);
        if (url.pathname !== '/oauth2callback') {
          res.writeHead(404).end('Not found');
          return;
        }

        const error = url.searchParams.get('error');
        const code = url.searchParams.get('code');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `<html><body style="font-family:system-ui;padding:40px">
            <h2>${error ? 'Authorization failed' : 'Authorization received'}</h2>
            <p>${error ? error : 'You can close this tab and return to the terminal.'}</p>
          </body></html>`
        );

        clearTimeout(timer);
        server.close();

        if (error) reject(new Error(`Google returned: ${error}`));
        else if (!code) reject(new Error('Google did not return an authorization code.'));
        else resolve(code);
      } catch (err) {
        clearTimeout(timer);
        server.close();
        reject(err);
      }
    });

    const timer = setTimeout(() => {
      server.close();
      reject(new Error('Timed out waiting for the Google redirect (5 minutes).'));
    }, timeoutMs);

    server.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    server.listen(port, '127.0.0.1');
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const config = loadBackupConfig();
  const accountId = args.account || 'default';
  const account =
    config.accounts.find((item) => item.id === accountId) ||
    config.accounts.find((item) => item.id === 'default') ||
    {};

  const clientId = args.clientId || account.clientId || process.env.GOOGLE_DRIVE_CLIENT_ID || '';
  const clientSecret =
    args.clientSecret || account.clientSecret || process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
  const email = (args.email || account.email || '').trim().toLowerCase();

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET are required. ' +
        'Create an OAuth Client ID (Desktop app) in Google Cloud Console, or pass --client-id/--client-secret.'
    );
  }
  if (!email) {
    throw new Error(
      'The Google account email is required so the token can be verified. ' +
        'Pass --email=you@gmail.com or set GOOGLE_DRIVE_ACCOUNT_EMAIL.'
    );
  }

  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:5555/oauth2callback';
  const redirectUrl = new URL(redirectUri);
  const port = Number(redirectUrl.port || 80);
  const manual = args.manual || redirectUri.includes('localhost') === false;

  const client = new OAuth2Client({ clientId, clientSecret, redirectUri });
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: DRIVE_SCOPES,
    login_hint: email,
  });

  console.log('\nOpen this URL in a browser logged in as ' + email + ':\n');
  console.log(authUrl + '\n');

  if (!args.noBrowser && !manual) {
    openBrowser(authUrl);
  }

  let code;
  if (manual || args.noBrowser) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      const answer = await rl.question('Paste the authorization code (or the full redirect URL): ');
      code = extractCode(answer);
    } finally {
      rl.close();
    }
  } else {
    console.log(`Waiting for Google to redirect to ${redirectUri} ...`);
    try {
      code = await waitForRedirect(port);
    } catch (err) {
      console.error(`Could not receive the redirect (${err.message}).`);
      const rl = createInterface({ input: stdin, output: stdout });
      try {
        const answer = await rl.question('Paste the authorization code instead: ');
        code = extractCode(answer);
      } finally {
        rl.close();
      }
    }
  }

  if (!code) throw new Error('No authorization code provided.');

  console.log('Exchanging the code for tokens...');
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Remove this app from ' +
        'https://myaccount.google.com/permissions and run the command again.'
    );
  }

  client.setCredentials(tokens);

  const identity = await getAccountIdentity({
    id: accountId,
    email,
    clientId,
    clientSecret,
    refreshToken: tokens.refresh_token,
  });

  console.log(`\nAuthenticated as: ${identity.email}`);

  const folder = await ensureBackupFolder(
    {
      id: accountId,
      email: identity.email,
      clientId,
      clientSecret,
      refreshToken: tokens.refresh_token,
      folderId: account.folderId || '',
    },
    config
  );

  console.log(`Backup folder ready: ${folder.name}`);
  console.log(`  https://drive.google.com/drive/folders/${folder.id}`);

  const prefix = accountId === 'default' ? 'GOOGLE_DRIVE' : `GOOGLE_DRIVE_${accountId.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  const emailKey = accountId === 'default' ? 'GOOGLE_DRIVE_ACCOUNT_EMAIL' : `${prefix}_EMAIL`;
  const tokenKey = accountId === 'default' ? 'GOOGLE_DRIVE_REFRESH_TOKEN' : `${prefix}_REFRESH_TOKEN`;

  console.log('\nAdd these lines to server/.env (never commit this file):\n');
  console.log(`${emailKey}=${identity.email}`);
  console.log(`${tokenKey}=${tokens.refresh_token}`);
  if (accountId !== 'default') {
    console.log(`\nAlso add to the account list:\nGOOGLE_DRIVE_ACCOUNTS=${config.accounts.map((a) => a.id).join(',') || accountId}`);
  }

  console.log(`
Next steps:
  1. Paste the values above into server/.env
  2. Set GOOGLE_DRIVE_BACKUP_ENABLED=true
  3. Run: npm run backup:dry-run
  4. Run: npm run backup

Important: keep the OAuth consent screen in "In production".
Refresh tokens created while the app is in "Testing" expire after 7 days.
`);
}

main().catch((err) => {
  console.error(`\nAuthorization failed: ${err.message}`);
  if (process.env.DEBUG_BACKUP) console.error(err);
  process.exitCode = 1;
});
