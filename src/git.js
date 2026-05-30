// git.js - Read staged diff from git
import { execSync, spawnSync } from 'node:child_process';

/**
 * Get the staged diff. Falls back to working tree diff if nothing is staged.
 * @returns {{ diff: string, source: 'staged' | 'unstaged' }}
 */
export function readDiff() {
  ensureGitRepo();

  let diff = run(['diff', '--cached', '--no-color']);
  if (diff.trim()) return { diff, source: 'staged' };

  diff = run(['diff', '--no-color']);
  return { diff, source: 'unstaged' };
}

/**
 * Get a compact summary of the diff when the full diff is too large.
 * Combines `git diff --stat` (file list + line counts) with the first
 * N lines of each file's actual diff, giving the AI enough signal to
 * pick a reasonable commit type and subject without flooding context.
 *
 * @param {'staged' | 'unstaged'} source
 * @param {number} headLinesPerFile - how many lines of each file's diff to include
 * @returns {string}
 */
export function readDiffSummary(source, headLinesPerFile = 20) {
  ensureGitRepo();
  const scope = source === 'staged' ? ['--cached'] : [];

  // 1. The stat: list of files + + / - line counts
  const stat = run(['diff', ...scope, '--stat', '--no-color']).trim();

  // 2. List of changed files (for per-file head snippets)
  const nameStatus = run(['diff', ...scope, '--name-status', '--no-color']).trim();
  const files = nameStatus
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2);

  // 3. For each file, grab the first N lines of its diff
  const heads = [];
  for (const [status, ...pathParts] of files) {
    const path = pathParts.join(' ');
    // Only show diff head for modifications/additions/renames; skip pure deletes
    if (status.startsWith('D')) continue;
    let fileDiff;
    try {
      fileDiff = run(['diff', ...scope, '--no-color', '--', path]);
    } catch {
      continue;
    }
    const head = fileDiff.split('\n').slice(0, headLinesPerFile).join('\n');
    heads.push(`--- ${status} ${path} ---\n${head}`);
  }

  return [
    '# DIFF SUMMARY (full diff was too large, showing stat + per-file heads)',
    '',
    '## File stats',
    stat,
    '',
    '## Per-file diff heads (first ' + headLinesPerFile + ' lines each)',
    ...heads
  ].join('\n');
}

/**
 * Run git commit -m with the given message.
 */
export function commit(message) {
  const result = spawnSync('git', ['commit', '-m', message], {
    stdio: 'inherit',
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(`git commit failed (exit ${result.status})`);
  }
}

function ensureGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  } catch {
    throw new Error('当前目录不是 git 仓库，请先 `git init` 或切换到项目目录。');
  }
}

function run(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}
