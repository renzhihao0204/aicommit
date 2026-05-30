# aicommit

> 🛑 **停止写 "update"、"fix bug"。让 Commit History 真正可读。**
>
> 10 秒生成符合 Conventional Commits 规范的 commit message，一条命令，开箱即用。

你是不是也被这些事烦过：

- commit 时纠结用 `feat` 还是 `chore`、`refactor` 还是 `style`
- scope 每次都得想半天，最后干脆不写
- 一次改了好几个文件，憋不出一句简洁准确的总结
- 团队规定用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，但 90% 的提交还是不规范
- 最后随手敲个 "update"、"fix bug"、"修改一下"，三个月后看历史一脸懵

`aicommit` 把这件事自动化了：

```
git add .          ← 你自己暂存改动
aicommit           ← 这个工具的事：读 diff → AI 生成 → 你回车确认 → 自动 commit
git push           ← 你自己推到远程
```

它只干中间那一步，但中间那一步是最烦的。零配置、不用注册、不用学新概念。600 行代码、1 个依赖，开箱即用。

## 看一眼实际效果

```
$ git add .

$ aicommit
🤖 正在生成 commit message... ✓

📝 生成结果：
────────────────────────────────────────────────────────────
feat(auth): add password reset flow with email verification
────────────────────────────────────────────────────────────
? 使用这条 message？ › ✅ 确认提交
[main 1c0ce56] feat(auth): add password reset flow with email verification
 3 files changed, 87 insertions(+), 12 deletions(-)

$ git push
Enumerating objects: 9, done.
...
To https://github.com/you/your-repo.git
   bc43563..1c0ce56  main -> main
```

整个过程从 `git add` 到代码上 GitHub，**不到 30 秒**，其中 aicommit 那一步只占 5 秒。

---

## 为什么不是「又一个 AI Commit 工具」

GitHub 上能搜到几十个类似工具，我自己用过其中四五个，每次都因为同样的原因放弃：

| 别的工具往往这样 | aicommit |
|---|---|
| 装一堆依赖、要写配置文件 | 1 个依赖，零配置 |
| 必须绑定特定 IDE / 编辑器 | 任何 terminal 都能用 |
| 必须注册账号、绑邮箱、登录 | 永不需要账号 |
| 默默上报使用数据 | 匿名统计**默认关闭**，首次运行明确询问 |
| 一个工具里塞了 commit + push + pr + changelog | **只做 commit message 这一件事** |
| 功能多到要看文档 | 一条命令 `aicommit`，就这 |

**目标不是功能最多，是摩擦最小。** 三步搞定：

```bash
git add .
aicommit
git push
```

如果你也只想要「能用、好用、别烦我」这三件事，这就是为你做的。

---

## 作者笔记：为什么做这个

试过几种方案，都不太顺手：

- **GUI 工具**（gitkraken / sourcetree）：要切到另一个窗口、点来点去，比手敲还慢
- **husky + commitlint 模板**：能强制格式，但写不出"内容"，纠结的还是纠结
- **手动遵守 Conventional Commits**：第一周很有干劲，第二周开始偷懒

最后发现最快的方式就是：**让 AI 看一眼 diff，直接给条 message，我审查通过就提交**。审查本来就要做（反正都要看一眼自己改了啥再 commit），AI 把"写"的部分干掉了，剩下"看"的部分就是举手之劳。

`aicommit` 就是把这个流程做到极致：**只做这一件事**，把它做到 10 秒以内、零摩擦。

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

# 2. 让 aicommit 帮你生成 commit message 并完成提交
aicommit

# 3. 推到远程（aicommit 不管这一步，你想 push 就 push）
git push
```

第 2 步会：

1. 读取你 `git add` 进暂存区的 diff
2. 发给 AI 模型生成符合 Conventional Commits 规范的 message
3. 让你选：**确认提交** / **编辑后提交** / **取消**
4. 确认后自动 `git commit`

整个过程从 `git add` 到 `git push` 完成代码上仓，**不到 30 秒**。其中 aicommit 那一步只占 5 秒左右。

### 第一次使用：配置 API Key

当前版本使用 [DeepSeek](https://platform.deepseek.com) 作为后端模型（便宜、快、效果稳定）。

```bash
aicommit --config key=sk_你的_API_Key
```

去 https://platform.deepseek.com/api_keys 申请 key，新用户送免费额度，够用几千次 commit 生成。

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

2. **匿名遥测**（**默认关闭**，仅当你首次运行时手动选择"同意"才开启）
   - **发送内容**：仅 4 个字段
     - 匿名 UUID（首次运行随机生成，存在 `~/.aicommit/config.json`）
     - aicommit 版本号
     - 操作系统（`win32` / `darwin` / `linux`）
     - Node.js 版本
   - **不发送**：代码、diff、文件名、路径、用户名、邮箱、API key、commit message
   - **关闭方法**：`aicommit --config telemetry=off` 或单次运行加 `--no-telemetry`
   - **首次运行时会明确询问**，默认选项是「不开启」

### 为什么要做匿名遥测（仅当你愿意时）

CLI 工具最大的痛点是「**做了完全不知道有没有人用**」。
我只想知道「**今天有多少独立用户跑了 aicommit**」，仅此而已。
**默认关闭**，不影响功能，完全可选。

### 数据边界一句话总结

| 数据 | 是否出网 | 谁能看到 |
|---|---|---|
| 你的 git diff | ✅ 是 | DeepSeek（用于生成 message） |
| 匿名 UUID | ⚖️ **默认否**，需用户主动同意 | 仅作者本人（统计 DAU） |
| API Key | ❌ 否（仅本地存储在 `~/.aicommit/config.json`） | 只有你 |
| 任何代码 / 文件名 / commit message | ❌ 否 | 没人 |

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

### 为什么当前只支持一个 AI 模型

第一版只验证一个变量：**这个工具的核心价值能不能成立**。模型选择只是实现细节。
后续如果用户反复要求 OpenAI/Claude/通义千问，会做 provider 抽象。**没有需求驱动不做。**

---

## Roadmap

见 [ROADMAP.md](ROADMAP.md)。

短期 candidates（会根据用户反馈排序）：
- [x] ~~长 diff 自动 fallback 到 `git diff --stat` 摘要模式~~ ✅ v0.1.0 已实现
- [ ] 从项目 commit 历史学习风格偏好（团队一致性）
- [ ] 本地模型支持（`aicommit --local`，企业场景）
- [ ] Husky / lefthook hook 集成示例

不会做：
- ❌ 多语言界面（保持极简）
- ❌ 账号系统（违反「不登录」原则）
- ❌ 批量提交 / 多仓库同步（不是这个工具的事）
- ❌ GUI（CLI 就够用）

---

## 贡献 / 反馈

发现 bug、有想法、有吐槽都欢迎：

- 提 issue: https://github.com/renzhihao0204/aicommit/issues
- 看真实用户反馈记录: [user-feedback.md](user-feedback.md)（Build in Public）

---

## License

MIT © 2026 renzhihao0204
