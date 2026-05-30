// config.js - Manage local config: UUID, user API key, telemetry preference
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CONFIG_DIR = join(homedir(), '.aicommit');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// Public key shipped with the package. Set at publish time via env var.
// Leave empty during development; users must configure their own key.
const PUBLIC_KEY = process.env.AICOMMIT_PUBLIC_KEY || '';

/**
 * Load config, creating defaults on first run.
 * @returns {{ uuid: string, userKey: string, telemetry: boolean, firstRun: boolean }}
 */
export function loadConfig() {
  ensureDir();
  let cfg = {};
  let firstRun = false;

  if (existsSync(CONFIG_FILE)) {
    try {
      cfg = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      cfg = {};
    }
  } else {
    firstRun = true;
  }

  if (!cfg.uuid) cfg.uuid = randomUUID();
  if (typeof cfg.telemetry !== 'boolean') cfg.telemetry = true;
  if (!cfg.userKey) cfg.userKey = '';

  saveConfig(cfg);
  return { ...cfg, firstRun };
}

export function saveConfig(cfg) {
  ensureDir();
  const safe = {
    uuid: cfg.uuid,
    userKey: cfg.userKey || '',
    telemetry: cfg.telemetry !== false
  };
  writeFileSync(CONFIG_FILE, JSON.stringify(safe, null, 2), { mode: 0o600 });
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
  if (PUBLIC_KEY) return { key: PUBLIC_KEY, source: 'public' };
  return { key: '', source: 'none' };
}

function ensureDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export const PATHS = { CONFIG_DIR, CONFIG_FILE };
