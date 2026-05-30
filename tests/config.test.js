// tests/config.test.js - Test local config: UUID, key, telemetry.
// Uses AICOMMIT_CONFIG_DIR to isolate each test in tmp dirs.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Pin a tmp config dir before importing config.js (env vars are read lazily there).
const TMP_ROOT = mkdtempSync(join(tmpdir(), 'aicommit-test-'));
process.env.AICOMMIT_CONFIG_DIR = TMP_ROOT;
delete process.env.AICOMMIT_PUBLIC_KEY;
delete process.env.DEEPSEEK_API_KEY;

const { loadConfig, saveConfig, setUserKey, setTelemetry, resolveApiKey, PATHS } =
  await import('../src/config.js');

beforeEach(() => {
  // Wipe and recreate the config file before each test for full isolation.
  if (existsSync(PATHS.CONFIG_FILE)) {
    rmSync(PATHS.CONFIG_FILE);
  }
});

after(() => {
  rmSync(TMP_ROOT, { recursive: true, force: true });
});

test('loadConfig: first run generates UUID and marks firstRun=true', () => {
  const cfg = loadConfig();
  assert.equal(cfg.firstRun, true);
  assert.match(cfg.uuid, /^[0-9a-f-]{36}$/i);
  assert.equal(cfg.userKey, '');
  // Telemetry must default to FALSE (opt-in policy).
  assert.equal(cfg.telemetry, false);
});

test('loadConfig: second run reuses UUID and marks firstRun=false', () => {
  const first = loadConfig();
  const second = loadConfig();
  assert.equal(second.firstRun, false);
  assert.equal(second.uuid, first.uuid);
});

test('loadConfig: corrupted JSON falls back to fresh defaults', () => {
  // Write garbage to the config file
  loadConfig(); // ensure file exists
  writeFileSync(PATHS.CONFIG_FILE, 'not json {{{');
  const cfg = loadConfig();
  // Should regenerate, not throw
  assert.match(cfg.uuid, /^[0-9a-f-]{36}$/i);
  // After opt-in policy change: default = false
  assert.equal(cfg.telemetry, false);
});

test('setUserKey: persists the key across loads', () => {
  setUserKey('sk_test_abc123');
  const cfg = loadConfig();
  assert.equal(cfg.userKey, 'sk_test_abc123');
});

test('setTelemetry: persists the flag across loads', () => {
  setTelemetry(false);
  let cfg = loadConfig();
  assert.equal(cfg.telemetry, false);
  setTelemetry(true);
  cfg = loadConfig();
  assert.equal(cfg.telemetry, true);
});

test('resolveApiKey: returns none when nothing configured', () => {
  const { key, source } = resolveApiKey();
  assert.equal(key, '');
  assert.equal(source, 'none');
});

test('resolveApiKey: returns user key when configured', () => {
  setUserKey('sk_user_xxx');
  const { key, source } = resolveApiKey();
  assert.equal(key, 'sk_user_xxx');
  assert.equal(source, 'user');
});

test('resolveApiKey: env var wins over user key', () => {
  setUserKey('sk_user_xxx');
  process.env.DEEPSEEK_API_KEY = 'sk_env_yyy';
  try {
    const { key, source } = resolveApiKey();
    assert.equal(key, 'sk_env_yyy');
    assert.equal(source, 'env');
  } finally {
    delete process.env.DEEPSEEK_API_KEY;
  }
});

test('resolveApiKey: public key used only when no user key', () => {
  process.env.AICOMMIT_PUBLIC_KEY = 'sk_pub_zzz';
  try {
    const { key, source } = resolveApiKey();
    assert.equal(key, 'sk_pub_zzz');
    assert.equal(source, 'public');
  } finally {
    delete process.env.AICOMMIT_PUBLIC_KEY;
  }
});

test('saveConfig: only persists whitelisted fields (no secret leakage)', () => {
  saveConfig({
    uuid: 'xxx-uuid',
    userKey: 'sk_safe',
    telemetry: false,
    secretField: 'this should NOT be saved',
    password: 'hunter2'
  });
  const raw = JSON.parse(readFileSync(PATHS.CONFIG_FILE, 'utf8'));
  assert.equal(raw.uuid, 'xxx-uuid');
  assert.equal(raw.userKey, 'sk_safe');
  assert.equal(raw.telemetry, false);
  assert.equal(raw.secretField, undefined);
  assert.equal(raw.password, undefined);
});
