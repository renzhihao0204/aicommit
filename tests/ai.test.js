// tests/ai.test.js - Test the cleanMessage helper that strips AI noise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanMessage } from '../src/ai.js';

test('cleanMessage: returns plain text unchanged', () => {
  assert.equal(
    cleanMessage('feat: add login'),
    'feat: add login'
  );
});

test('cleanMessage: trims whitespace', () => {
  assert.equal(
    cleanMessage('  feat: add login  \n'),
    'feat: add login'
  );
});

test('cleanMessage: strips triple-backtick code fences', () => {
  assert.equal(
    cleanMessage('```\nfeat: add login\n```'),
    'feat: add login'
  );
});

test('cleanMessage: strips language-tagged code fences', () => {
  assert.equal(
    cleanMessage('```text\nfix(api): handle null response\n```'),
    'fix(api): handle null response'
  );
});

test('cleanMessage: strips surrounding double quotes', () => {
  assert.equal(
    cleanMessage('"chore: bump deps"'),
    'chore: bump deps'
  );
});

test('cleanMessage: strips surrounding single quotes', () => {
  assert.equal(
    cleanMessage("'docs: update readme'"),
    'docs: update readme'
  );
});

test('cleanMessage: preserves inner quotes', () => {
  assert.equal(
    cleanMessage('feat: support "smart" mode'),
    'feat: support "smart" mode'
  );
});

test('cleanMessage: handles multi-line messages with body', () => {
  const input = 'feat(auth): add password reset\n\nSupports email verification.';
  assert.equal(cleanMessage(input), input);
});

test('cleanMessage: strips both fences and quotes together', () => {
  // AI sometimes wraps in BOTH fence and quotes
  const input = '```\n"feat: add login"\n```';
  // Current behavior: strips fence first, then quotes
  assert.equal(cleanMessage(input), 'feat: add login');
});
