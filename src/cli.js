#!/usr/bin/env node
// cli.js - Entry point. Parses args, drives the main flow.
import prompts from 'prompts';
import { readDiff, commit } from './git.js';
import { generateMessage } from './ai.js';
import {
  loadConfig,
  resolveApiKey,
  setUserKey,
  setTelemetry,
  PATHS
} from './config.js';
import { ping } from './telemetry.js';

const DIFF_LIMIT = 4000; // characters; ~3000 tokens
const VERSION = '0.1.0';

const HELP = `aicommit ${VERSION} - AI-powered git commit message generator

USAGE
  aicommit                 Generate a commit message for the staged diff
  aicommit --no-telemetry  Run once without sending anonymous ping
  aicommit --config key=sk_xxxx    Save your own DeepSeek API key
  aicommit --config telemetry=off  Disable anonymous usage stats permanently
  aicommit --config telemetry=on   Enable anonymous usage stats
  aicommit --version       Print version
  aicommit --help          Show this help

PRIVACY
  Your git diff is sent to DeepSeek (https://api.deepseek.com) to generate
  the commit message. Nothing is stored on our side. Anonymous usage stats
  (UUID + version only, no code) can be disabled with --no-telemetry.

CONFIG FILE
  ${PATHS.CONFIG_FILE}`;

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    return 0;
  }
  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    return 0;
  }

  // Handle --config foo=bar
  const cfgIdx = args.indexOf('--config');
  if (cfgIdx !== -1) {
    const kv = args[cfgIdx + 1];
    return handleConfig(kv);
  }

  const noTelemetryFlag = args.includes('--no-telemetry');

  // Load config (also creates ~/.aicommit on first run)
  const cfg = loadConfig();

  if (cfg.firstRun) {
    console.log('👋 欢迎使用 aicommit！');
    console.log('   工具会发送匿名使用统计（仅 UUID + 版本号，绝不收集代码）。');
    console.log('   可随时用 `aicommit --config telemetry=off` 关闭。\n');
  }

  // 1. Read diff
  let diff, source;
  try {
    ({ diff, source } = readDiff());
  } catch (err) {
    console.error('❌', err.message);
    return 1;
  }

  if (!diff.trim()) {
    console.log('🤔 没有发现任何改动。请先用 `git add <file>` 暂存修改，再运行 aicommit。');
    return 0;
  }

  if (source === 'unstaged') {
    console.log('⚠️  没有暂存的改动，使用工作区 diff 生成（不会自动 commit）。');
  }

  // 2. Length check (compute on bytes to be conservative for multi-byte chars)
  if (diff.length > DIFF_LIMIT) {
    console.log(`\n😯 老板，这次改动有点大哦（${diff.length} 字符 > ${DIFF_LIMIT}）`);
    console.log('   AI 脑容量不够啦，建议：');
    console.log('   - 先 `git add` 部分文件分批提交');
    console.log('   - 或拆成多个原子提交，每次只 commit 相关的改动');
    return 2;
  }

  // 3. Resolve API key
  const { key, source: keySource } = resolveApiKey();
  if (!key) {
    console.error('❌ 没有可用的 DeepSeek API Key。');
    console.error('   请前往 https://platform.deepseek.com/api_keys 获取，然后运行：');
    console.error('   aicommit --config key=sk_xxxxxxxxxxxx');
    return 1;
  }

  // 4. Call AI
  process.stdout.write('🤖 正在生成 commit message...');
  let message;
  try {
    message = await generateMessage(diff, key);
    process.stdout.write(' ✓\n');
  } catch (err) {
    process.stdout.write(' ✗\n');
    return handleAiError(err, keySource);
  }

  // 5. Show + confirm
  console.log('\n📝 生成结果：');
  console.log('─'.repeat(60));
  console.log(message);
  console.log('─'.repeat(60));

  // If diff was unstaged, only display — don't commit.
  if (source === 'unstaged') {
    console.log('\n（未暂存模式，不会自动提交。复制上面的 message 自行使用即可。）');
    ping({ uuid: cfg.uuid, telemetry: cfg.telemetry && !noTelemetryFlag });
    return 0;
  }

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: '使用这条 message？',
    choices: [
      { title: '✅ 确认提交', value: 'commit' },
      { title: '✏️  编辑后提交', value: 'edit' },
      { title: '❌ 取消', value: 'cancel' }
    ],
    initial: 0
  });

  if (action === 'cancel' || action === undefined) {
    console.log('已取消。');
    return 0;
  }

  let finalMsg = message;
  if (action === 'edit') {
    const { edited } = await prompts({
      type: 'text',
      name: 'edited',
      message: '修改 commit message：',
      initial: message
    });
    if (!edited || !edited.trim()) {
      console.log('已取消。');
      return 0;
    }
    finalMsg = edited.trim();
  }

  try {
    commit(finalMsg);
  } catch (err) {
    console.error('❌', err.message);
    return 1;
  }

  // 6. Telemetry ping (fire-and-forget, after success)
  ping({ uuid: cfg.uuid, telemetry: cfg.telemetry && !noTelemetryFlag });
  return 0;
}

function handleConfig(kv) {
  if (!kv || !kv.includes('=')) {
    console.error('❌ 用法: aicommit --config key=sk_xxxx 或 aicommit --config telemetry=on|off');
    return 1;
  }
  const eq = kv.indexOf('=');
  const k = kv.slice(0, eq).trim();
  const v = kv.slice(eq + 1).trim();

  if (k === 'key') {
    if (!v) {
      console.error('❌ key 不能为空');
      return 1;
    }
    setUserKey(v);
    console.log('✅ 已保存你的 DeepSeek API Key 到', PATHS.CONFIG_FILE);
    return 0;
  }
  if (k === 'telemetry') {
    if (v !== 'on' && v !== 'off') {
      console.error('❌ telemetry 只能是 on 或 off');
      return 1;
    }
    setTelemetry(v === 'on');
    console.log(`✅ 匿名统计已${v === 'on' ? '开启' : '关闭'}`);
    return 0;
  }
  console.error(`❌ 未知的配置项: ${k}`);
  return 1;
}

function handleAiError(err, keySource) {
  const code = err.message.split(':')[0];
  switch (code) {
    case 'AUTH_ERROR':
      console.error('❌ API Key 无效或已过期。请用 `aicommit --config key=sk_xxxx` 重新配置。');
      return 1;
    case 'RATE_LIMIT':
    case 'QUOTA_EXCEEDED':
      if (keySource === 'public') {
        console.error('🥹 公用额度已被大家刷爆啦！');
        console.error('   请用 `aicommit --config key=你的DeepSeek Key` 配置后继续使用。');
        console.error('   Key 获取地址: https://platform.deepseek.com/api_keys');
      } else {
        console.error('❌ 你的 DeepSeek 账户额度已用尽或触发限流，请稍后重试或充值。');
      }
      return 1;
    case 'NETWORK_ERROR':
      console.error('❌ 网络错误，请检查网络连接：', err.message);
      return 1;
    case 'EMPTY_RESPONSE':
      console.error('❌ AI 返回了空内容，请重试。');
      return 1;
    default:
      console.error('❌', err.message);
      return 1;
  }
}

main()
  .then((code) => {
    // Set exitCode instead of calling process.exit() so that any in-flight
    // fetch / undici handles can close cleanly. Avoids libuv assertion on
    // Node 24 + Windows when the event loop is torn down mid-request.
    process.exitCode = code ?? 0;
  })
  .catch((err) => {
    console.error('❌ 未捕获错误：', err);
    process.exitCode = 1;
  });
