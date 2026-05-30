# aicommit

> Pipe your `git diff`, get a Conventional Commits message. Powered by DeepSeek.
> No accounts. No config files to maintain. One command, ten seconds.

```
$ git add .
$ aicommit
🤖 正在生成 commit message... ✓

📝 生成结果：
────────────────────────────────────────────────────────────
feat(auth): add password reset flow with email verification
────────────────────────────────────────────────────────────
? 使用这条 message？ › ✅ 确认提交
```

---

## 为什么做这个

我自己每天写 commit message 都要纠结：

- 是 `feat` 还是 `chore`？
- scope 应该写什么？
- 要不要写正文？
- 改了一堆东西，怎么用一句话总结？

试过 GUI 工具、试过 husky 模板，都嫌麻烦。最后发现最快的方式就是：**让 AI 看一眼 diff，直接吐一条 message，我确认就 commit**。

`aicommit` 就是这个工具。500 行代码，1 个依赖，零配置开箱用。

---

## 安装

```bash
npm install -g aicommit
```

需要 Node.js >= 18。

---

## 使用

### 基本用法

```bash
# 1. 暂存你的改动
git add .

# 2. 生成 commit message
aicommit
```

工具会：

1. 读取你 `git add` 进暂存区的 diff
2. 发给 DeepSeek 生成符合 Conventional Commits 规范的 message
3. 让你选：**确认提交** / **编辑后提交** / **取消**
4. 确认后自动 `git commit`

全程不到 10 秒。

### 第一次使用：配置 API Key

```bash
aicommit --config key=sk_你的DeepSeek_API_Key
```

去 https://platform.deepseek.com/api_keys 申请，新用户送免费额度，够用几千次 commit 生成。

### 所有命令

```
aicommit                          # 生成 commit message（核心命令）
aicommit --no-telemetry           # 这次运行不发匿名统计
aicommit --config key=sk_xxxx     # 配置你自己的 DeepSeek key
aicommit --config telemetry=off   # 永久关闭匿名统计
aicommit --config telemetry=on    # 重新开启匿名统计
aicommit --version                # 查看版本
aicommit --help                   # 显示帮助
```

---

## 隐私说明（请认真看一下）

### 数据去了哪里

工具只会向**两个**地方发送数据：

1. **DeepSeek API**（`https://api.deepseek.com`）
   - **发送内容**：你的 `git diff` 内容 + 一段固定的 system prompt
   - **目的**：生成 commit message
   - **官方说明**：DeepSeek 对 API 调用的数据政策见其 [服务条款](https://platform.deepseek.com/terms)
   - **我们不保留任何内容**：aicommit 是本地 CLI，diff 直连 DeepSeek，不经过任何中转服务器

2. **匿名遥测**（仅当 telemetry 开启时）
   - **发送内容**：仅 4 个字段
     - 匿名 UUID（首次运行随机生成，存在 `~/.aicommit/config.json`）
     - aicommit 版本号
     - 操作系统（`win32` / `darwin` / `linux`）
     - Node.js 版本
   - **不发送**：代码、diff、文件名、路径、用户名、邮箱、API key、commit message
   - **关闭方法**：`aicommit --config telemetry=off` 或单次运行加 `--no-telemetry`

### 为什么要做匿名遥测

CLI 工具最大的痛点是「**做了完全不知道有没有人用**」。
我只想知道「**今天有多少独立用户跑了 aicommit**」，仅此而已。
不想要这个数据可以一键关掉，不影响功能。

### 数据边界一句话总结

| 数据 | 是否出网 | 谁能看到 |
|---|---|---|
| 你的 git diff | ✅ 是 | DeepSeek |
| 匿名 UUID | ✅ 是（除非关闭遥测） | aicommit 作者 |
| API Key | ❌ 否（仅本地存储在 `~/.aicommit/config.json`） | 只有你 |
| 任何代码/文件名/commit message | ❌ 否 | 没人 |

---

## 一些设计决策

### 为什么 diff 限制 4000 字符

DeepSeek API 上下文足够大，但**强制限制能逼用户做原子提交**。一次改 500 行的提交，事后没人看得懂。
触发限制时工具会建议「分批 `git add`」，这是 git 最佳实践本身。

### 为什么没有 GUI

CLI 用完即走，零启动开销，能融入任何编辑器的 terminal。GUI 反而增加切换成本。

### 为什么没有「自定义提交格式」

Conventional Commits 是行业事实标准。**第一版只支持一种规范，是为了把这一种做好**。
有强烈需求再加，目前不接 PR。

### 为什么没有「多 AI 模型支持」

DeepSeek 便宜、快、效果够用。Day 1 只验证一个变量（这个工具的核心价值）能不能成立。
后续如果用户反复要求 OpenAI/Claude/通义千问，会做 provider 抽象。**没有需求驱动不做**。

---

## Roadmap

见 [ROADMAP.md](ROADMAP.md)。

短期：
- [ ] 长 diff 自动 fallback 到 `git diff --stat` 摘要模式
- [ ] commit message 历史里学习用户偏好（可选）
- [ ] Husky / lefthook hook 集成示例

不会做：
- ❌ 多语言界面（保持极简）
- ❌ 账号系统（违反「不登录」原则）
- ❌ 批量提交 / 多仓库同步（不是这个工具的事）

---

## 贡献 / 反馈

发现 bug、有想法、有吐槽都欢迎：

- 提 issue: https://github.com/renzhihao0204/aicommit/issues
- 看真实用户反馈记录: [user-feedback.md](user-feedback.md)（Build in Public）

---

## License

MIT © 2026 renzhihao0204
