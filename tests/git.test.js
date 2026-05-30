// tests/git.test.js - Test git diff readers against a real tmp repo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { readDiff, readDiffSummary } from '../src/git.js';

const REPO = mkdtempSync(join(tmpdir(), 'aicommit-git-test-'));
const ORIGINAL_CWD = process.cwd();

function git(...args) {
  return execSync(`git ${args.join(' ')}`, { cwd: REPO, encoding: 'utf8' });
}

before(() => {
  // Create a real git repo we can run against
  git('init', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  writeFileSync(join(REPO, 'README.md'), '# initial\n');
  git('add', '.');
  git('commit', '-m', '"initial"');

  process.chdir(REPO);
});

after(() => {
  process.chdir(ORIGINAL_CWD);
  rmSync(REPO, { recursive: true, force: true });
});

test('readDiff: returns empty when nothing changed', () => {
  const { diff, source } = readDiff();
  assert.equal(diff.trim(), '');
  // No staged, no unstaged → returns unstaged empty
  assert.equal(source, 'unstaged');
});

test('readDiff: reads unstaged working-tree changes', () => {
  writeFileSync(join(REPO, 'README.md'), '# initial\nnew line\n');
  const { diff, source } = readDiff();
  assert.ok(diff.includes('new line'), 'diff should contain the new line');
  assert.equal(source, 'unstaged');
});

test('readDiff: prefers staged over unstaged when both exist', () => {
  // Stage the README change
  git('add', 'README.md');
  // Now make ANOTHER unstaged change
  writeFileSync(join(REPO, 'README.md'), '# initial\nnew line\nyet another\n');

  const { diff, source } = readDiff();
  assert.equal(source, 'staged');
  assert.ok(diff.includes('new line'), 'staged diff should still be visible');
  assert.ok(!diff.includes('yet another'), 'unstaged extra should NOT be in staged diff');
});

test('readDiffSummary: produces stat + per-file heads for staged changes', () => {
  // Already have staged change from the previous test; add a second file
  writeFileSync(join(REPO, 'b.txt'), 'hello from b\n');
  git('add', 'b.txt');

  const summary = readDiffSummary('staged', 5);

  assert.ok(summary.includes('DIFF SUMMARY'), 'should have header');
  assert.ok(summary.includes('## File stats'), 'should have stat section');
  assert.ok(summary.includes('README.md'), 'should list README.md');
  assert.ok(summary.includes('b.txt'), 'should list b.txt');
  assert.ok(summary.includes('Per-file diff heads'), 'should have heads section');
});

test('readDiffSummary: works for unstaged diff too', () => {
  // Commit current staged changes to reset, then make unstaged-only changes
  git('commit', '-m', '"stage cleanup"');
  writeFileSync(join(REPO, 'README.md'), '# initial\nnew line\nfresh unstaged\n');

  const summary = readDiffSummary('unstaged', 5);
  assert.ok(summary.includes('README.md'));
  assert.ok(summary.includes('fresh unstaged') || summary.includes('+'));
});
