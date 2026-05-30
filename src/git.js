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
