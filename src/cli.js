#!/usr/bin/env node
// cli.js - Entry point. Parses args, drives the main flow.
import prompts from 'prompts';
import { readDiff, readDiffSummary, commit } from './git.js';
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

const HELP = `aicommit ${VERSION} - Stop writing "update" / "fix bug". Let commit history be readable.

USAGE
  aicommit                          Generate a commit message for the staged diff
  aicommit --no-telemetry           Run once without sending anonymous ping
  aicommit --config key=sk_xxxx     Save your AI provider API key
  aicommit --config telemetry=on    Opt in to anonymous usage stats (default: off)
  aicommit --config telemetry=off   Opt out of anonymous usage stats
  aicommit --version                Print version
  aicommit --help                   Show this help

PRIVACY
  - Your git diff is sent to the configured AI provider (currently DeepSeek)
    to generate the commit message. The diff is NOT stored on our side.
  - Anonymous usage stats are OPT-IN (default off). If enabled, only sends
    a random UUID + version + OS + Node version. NO code, NO diff, NO paths.

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
    console.log('');
    console.log('   一个小请求：能否帮我收集匿名使用统计？');
    console.log('   只发送：随机 UUID + 版本号 + 操作系统类型（4 个字段）');
    console.log('   绝不发送：代码、diff、文件名、commit message、任何隐私信息');
    console.log('   目的：让我知道有多少独立用户在用，是否值得继续维护');
    console.log('');

    const { optIn } = await prompts({
      type: 'confirm',
      name: 'optIn',
      message: '同意开启匿名统计吗？（不影响使用，随时可关）',
      initial: false  // default = NO. respect user privacy.
    });

    if (optIn) {
      setTelemetry(true);
      console.log('✅ 已开启。感谢支持！可用 `aicommit --config telemetry=off` 关闭。\n');
      cfg.telemetry = true;
    } else {
      console.log('👍 已保持关闭。可用 `aicommit --config telemetry=on` 随时开启。\n');
    }
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

  // 2. Length check. If too large, offer a summary-mode fallback instead
  //    of hard-failing — many real-world commits are legitimately large
  //    (single big file, mass refactor, generated code) and can't be split.
  let payload = diff;
  let usedSummary = false;
  if (diff.length > DIFF_LIMIT) {
    console.log(`\n😯 老板，这次改动有点大哦（${diff.length} 字符 > ${DIFF_LIMIT}）`);

    const { choice } = await prompts({
      type: 'select',
      name: 'choice',
      message: '怎么处理？',
      choices: [
        {
          title: '📊 切到摘要模式继续（用 git diff --stat + 每个文件前 20 行）',
          value: 'summary'
        },
        {
          title: '✂️  取消，我自己拆 commit',
          value: 'cancel'
        }
      ],
      initial: 0
    });

    if (choice !== 'summary') {
      console.log('已取消。建议：分批 `git add` 部分文件，或拆成多个原子提交。');
      return 2;
    }

    try {
      payload = readDiffSummary(source);
      usedSummary = true;
      console.log(`✓ 已切换到摘要模式（${payload.length} 字符）`);
    } catch (err) {
      console.error('❌ 生成摘要失败：', err.message);
      return 1;
    }

    // Even summary should fit; if not, bail out.
    if (payload.length > DIFF_LIMIT * 2) {
      console.error(`❌ 摘要仍然过大（${payload.length} 字符），请拆分提交。`);
      return 2;
    }
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
    message = await generateMessage(payload, key, { isSummary: usedSummary });
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
