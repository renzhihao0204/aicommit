// config.js - Manage local config: UUID, user API key, telemetry preference
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Resolved lazily so tests can override AICOMMIT_CONFIG_DIR per-test.
function getConfigDir() {
  return process.env.AICOMMIT_CONFIG_DIR || join(homedir(), '.aicommit');
}
function getConfigFile() {
  return join(getConfigDir(), 'config.json');
}

// Public key shipped with the package. Set at publish time via env var.
// Leave empty during development; users must configure their own key.
function getPublicKey() {
  return process.env.AICOMMIT_PUBLIC_KEY || '';
}

/**
 * Load config, creating defaults on first run.
 * @returns {{ uuid: string, userKey: string, telemetry: boolean, firstRun: boolean }}
 */
export function loadConfig() {
  ensureDir();
  let cfg = {};
  let firstRun = false;

  const file = getConfigFile();
  if (existsSync(file)) {
    try {
      cfg = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      cfg = {};
    }
  } else {
    firstRun = true;
  }

  if (!cfg.uuid) cfg.uuid = randomUUID();
  // Telemetry is OPT-IN. Default = false. Users must explicitly enable.
  if (typeof cfg.telemetry !== 'boolean') cfg.telemetry = false;
  if (!cfg.userKey) cfg.userKey = '';

  saveConfig(cfg);
  return { ...cfg, firstRun };
}

export function saveConfig(cfg) {
  ensureDir();
  const safe = {
    uuid: cfg.uuid,
    userKey: cfg.userKey || '',
    telemetry: cfg.telemetry === true  // explicit boolean true, otherwise false
  };
  writeFileSync(getConfigFile(), JSON.stringify(safe, null, 2), { mode: 0o600 });
}

export function setUserKey(key) {
  const cfg = loadConfig();
  cfg.userKey = key;
  saveConfig(cfg);
}

export function setTelemetry(enabled) {
  const cfg = loadConfig();
  cfg.telemetry = enabled;
  saveConfig(cfg);
}

/**
 * Resolve which API key to use.
 * Priority: env var > user-configured > built-in public key.
 * @returns {{ key: string, source: 'env' | 'user' | 'public' | 'none' }}
 */
export function resolveApiKey() {
  if (process.env.DEEPSEEK_API_KEY) {
    return { key: process.env.DEEPSEEK_API_KEY, source: 'env' };
  }
  const cfg = loadConfig();
  if (cfg.userKey) return { key: cfg.userKey, source: 'user' };
  const pub = getPublicKey();
  if (pub) return { key: pub, source: 'public' };
  return { key: '', source: 'none' };
}

function ensureDir() {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

// Exported as getters so they always reflect the current env-resolved paths.
export const PATHS = {
  get CONFIG_DIR() { return getConfigDir(); },
  get CONFIG_FILE() { return getConfigFile(); }
};
