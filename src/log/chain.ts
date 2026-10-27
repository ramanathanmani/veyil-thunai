/**
 * Tamper-evident cryptographic hash chain for worker exposure logs.
 *
 * Implements Section 8:
 * - Canonical JSON formatting (sorted keys, no extraneous whitespace, UTF-8)
 * - SHA-256 linking: hash = SHA-256(canonical(entry without hash))
 * - verifyChain: returns -1 if intact, or index of first broken link
 */

import { Band, WorkloadClass, WorkerState } from '../engine/limits';

export interface LogEntry {
  id: string; // uuid
  startedAt: string; // ISO string with timezone offset
  endedAt: string | null;
  preset: string;
  workload: WorkloadClass;
  workerState: WorkerState;
  placeRounded: { lat: number; lon: number }; // 2 decimals
  forecastAtStart: { wbgtC: number; band: Band; dataQuality: string };
  restBreaks: { start: string; end: string }[];
  incentivePressure: boolean | null; // optional: "I was pushed to keep working"
  note: string; // optional, max 280 chars
  prevHash: string; // '' for the first entry
  hash: string; // SHA-256 hex of canonical JSON of all other fields
}

/**
 * Produces canonical deterministic JSON: keys recursively sorted alphabetically,
 * no unnecessary whitespace, UTF-8.
 */
export function canonicalJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(
    (key) => JSON.stringify(key) + ':' + canonicalJson(obj[key])
  );
  return '{' + pairs.join(',') + '}';
}

/**
 * Computes SHA-256 hex string.
 * Uses Web Crypto API in browser / Node 19+ environments.
 */
export async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(message);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for Node environment if crypto.subtle is unavailable
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(message, 'utf8').digest('hex');
  } catch (err) {
    throw new Error('SHA-256 crypto implementation unavailable: ' + String(err));
  }
}

/**
 * Computes the tamper-evident hash for a log entry.
 * Evaluates canonical JSON of all fields EXCEPT the `hash` field itself.
 */
export async function computeEntryHash(
  entry: Omit<LogEntry, 'hash'> & { hash?: string }
): Promise<string> {
  const { hash: _omitted, ...dataToHash } = entry;
  const canonical = canonicalJson(dataToHash);
  return sha256Hex(canonical);
}

/**
 * Verifies the integrity of an exposure log chain.
 *
 * Checks:
 * 1. Entry hash matches SHA-256 of canonical fields.
 * 2. prevHash matches previous entry's hash (first entry must have prevHash === '').
 *
 * Returns:
 * - -1 if the entire chain is intact.
 * - index of the first broken link or modified entry.
 */
export async function verifyChain(entries: LogEntry[]): Promise<number> {
  if (!entries || entries.length === 0) {
    return -1;
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Check prevHash linkage
    const expectedPrevHash = i === 0 ? '' : entries[i - 1].hash;
    if (entry.prevHash !== expectedPrevHash) {
      return i;
    }

    // Check content hash
    const computed = await computeEntryHash(entry);
    if (entry.hash !== computed) {
      return i;
    }
  }

  return -1;
}
