// ai.js - Call DeepSeek API to generate commit message
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

const SYSTEM_PROMPT = `你是一个严格遵守 Conventional Commits 规范的 git commit message 生成器。

规则：
1. 格式必须是: <type>(<scope>): <subject>
2. type 必须是: feat | fix | docs | style | refactor | perf | test | chore | build | ci
3. scope 可省略，subject 用祈使句、首字母小写、不超过 72 字符、结尾不加句号
4. 只输出 commit message 本身，不要任何解释、引号、代码块、前后缀
5. 如果改动较大需要正文，在 subject 后空一行，再用简洁的中英文要点描述
6. 优先使用英文，除非用户的代码注释/字符串明显是中文项目`;

/**
 * Generate a commit message from a diff (or diff summary) using DeepSeek.
 * @param {string} payload - raw git diff, or a summary produced by readDiffSummary
 * @param {string} apiKey
 * @param {{ isSummary?: boolean }} [opts]
 * @returns {Promise<string>}
 */
export async function generateMessage(payload, apiKey, opts = {}) {
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const userPrompt = opts.isSummary
    ? `下面不是完整 diff，而是一份摘要（git diff --stat + 每个文件前 20 行）。\n` +
      `请基于摘要推断主题，生成 commit message：\n\n${payload}`
    : `请根据以下 git diff 生成 commit message：\n\n${payload}`;

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 200
  };

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Connection': 'close'
      },
      body: JSON.stringify(body),
      keepalive: false
    });
  } catch (err) {
    throw new Error(`NETWORK_ERROR: ${err.message}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_ERROR');
  }
  if (res.status === 429) {
    throw new Error('RATE_LIMIT');
  }
  if (res.status === 402) {
    throw new Error('QUOTA_EXCEEDED');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API_ERROR: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message?.content?.trim();
  if (!msg) {
    throw new Error('EMPTY_RESPONSE');
  }
  return cleanMessage(msg);
}

/**
 * Strip code fences, surrounding quotes and trailing whitespace.
 */
function cleanMessage(text) {
  let s = text.trim();
  // Remove code fences if model wrapped them
  s = s.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
  // Remove surrounding quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}
