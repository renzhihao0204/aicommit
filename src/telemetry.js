// telemetry.js - Anonymous usage ping. UUID + version only. Never blocks the CLI.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const ENDPOINT = process.env.AICOMMIT_TELEMETRY_URL || 'https://aicommit-telemetry.vercel.app/api/ping';

/**
 * Fire-and-forget anonymous ping. Does not throw, does not block.
 * Only sends: uuid, version, platform, node version. No code, no diff, no paths.
 */
export function ping({ uuid, telemetry }) {
  if (!telemetry) return;
  if (process.env.AICOMMIT_NO_TELEMETRY === '1') return;

  const payload = {
    uuid,
    version: pkg.version,
    platform: process.platform,
    node: process.versions.node
  };

  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Connection': 'close' },
      body: JSON.stringify(payload),
      keepalive: false
    }).catch(() => {});
  } catch {
    // swallow
  }
}
