import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

const MAGIC = Buffer.from('FDBK1');
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN;

/**
 * Backup archive layout (all binary, streaming friendly):
 *
 *   "FDBK1" | salt(16) | iv(12) | ciphertext(...) | gcmTag(16)
 *
 * The passphrase is stretched with scrypt. AES-256-GCM gives confidentiality
 * plus tamper detection: a modified or truncated archive fails to decrypt.
 */

export async function isEncryptedFile(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(MAGIC.length), 0, MAGIC.length, 0);
    return bytesRead === MAGIC.length && buffer.equals(MAGIC);
  } finally {
    await handle.close();
  }
}

export async function encryptFile(inputPath, outputPath, passphrase) {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('DB_BACKUP_ENCRYPTION_KEY is missing or too short.');
  }

  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = scryptSync(passphrase, salt, KEY_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const out = createWriteStream(outputPath, { mode: 0o600 });
  out.write(Buffer.concat([MAGIC, salt, iv]));

  await pipeline(createReadStream(inputPath), cipher, out);
  await fs.appendFile(outputPath, cipher.getAuthTag());

  return outputPath;
}

export async function decryptFile(inputPath, outputPath, passphrase) {
  if (!passphrase) {
    throw new Error('Archive is encrypted. Set DB_BACKUP_ENCRYPTION_KEY or pass --key.');
  }

  const stat = await fs.stat(inputPath);
  if (stat.size <= HEADER_LEN + TAG_LEN) {
    throw new Error('Encrypted archive is truncated.');
  }

  const handle = await fs.open(inputPath, 'r');
  let header;
  let tag;
  try {
    header = Buffer.alloc(HEADER_LEN);
    await handle.read(header, 0, HEADER_LEN, 0);
    tag = Buffer.alloc(TAG_LEN);
    await handle.read(tag, 0, TAG_LEN, stat.size - TAG_LEN);
  } finally {
    await handle.close();
  }

  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('File is not a FontConverter backup archive (bad magic header).');
  }

  const salt = header.subarray(MAGIC.length, MAGIC.length + SALT_LEN);
  const iv = header.subarray(MAGIC.length + SALT_LEN, HEADER_LEN);
  const key = scryptSync(passphrase, salt, KEY_LEN);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  await pipeline(
    createReadStream(inputPath, { start: HEADER_LEN, end: stat.size - TAG_LEN - 1 }),
    decipher,
    createWriteStream(outputPath, { mode: 0o600 })
  );

  return outputPath;
}
