# 用户反馈原话档案
> 严格遵循执行手册铁律 29：永远记录用户原话，不要自己总结。
> 真正值钱的需求经常藏在一句吐槽里。

---

## 2026-05-30 · 首位用户（作者自测，root-commit 时刻）

### 场景
项目第一个原子提交（.gitignore + LICENSE），用 aicommit 自举生成 commit message。

### 实际输出
```
chore(init): add .gitignore and LICENSE files
```

### 用户原话
> "这就完事了呗"

### 我的观察（不替代原话，作为补充）
- 用户语气很轻松/略带"就这？"的感觉
- 说明体验流畅到超出预期，没有任何卡顿/困惑/疑问
- 整个流程：`git add` → `node src/cli.js` → 方向键确认 → 完成，全程 < 10 秒
- 符合需求清单的"上线标准"：「全程 10 秒」✅

### 候选改进方向（不立即做，等更多反馈再判断）
- [ ] 提交成功后是否应该展示 commit hash 和 message？（git 自带输出已经有了，可能多余）
- [ ] 是否需要 `--push` 参数一键 commit+push？（违反"一个工具只解决一个问题"原则，**否决**）

---


## 2026-05-30 · 首位用户（作者自测，第 2 个原子提交）

### 场景
提交 package.json + package-lock.json（npm 依赖配置初始化）。

### 实际输出
```
feat: initialize project with package.json and prompts dependency
```

### 用户/作者观察
- 用户没明确吐槽，但作为审查者发现：type 用了 `feat`，但更合适的是 `chore`
- 仅添加依赖/配置文件没有面向最终用户的功能新增，社区主流规范倾向于 `chore(deps)` 或 `chore`
- 这是 **Prompt 质量问题**，不是 Bug：AI 把"项目从 0 到 1"理解成了"新功能"

### 候选改进方向
- [ ] 优化 system prompt：明确告诉 AI「仅添加依赖、配置、文档、构建脚本时一律用 chore」
- [ ] 在 prompt 里加 few-shot 示例
- [ ] **暂不重构**（按手册铁律 31，没到 1000 活跃用户/真实收入门槛）

### 决策
**不立即修改 prompt**。原因：
1. N=1 不能下结论，可能只是单次随机性
2. 手册铁律 11：第一版禁止追求完美，先验证有人用
3. 这条 message 仍是合法可用的 Conventional Commits 格式

---

## 2026-05-30 · 首位用户（作者自测，触发长度限制）

### 场景
尝试一次性提交 src/cli.js + src/git.js + src/ai.js（3 个源码文件，约 371 行）。

### 实际输出
```
😯 老板，这次改动有点大哦（10868 字符 > 4000）
   AI 脑容量不够啦，建议：
   - 先 `git add` 部分文件分批提交
   - 或拆成多个原子提交，每次只 commit 相关的改动
```

### 验证结果
✅ **Gemini 补坑建议 #3「Diff长度硬限制」按需求清单 28-34 行设计 100% 正常工作**
- 阈值 4000 字符正确触发
- 文案友好、有 emoji、给出可执行的建议（不是冷冰冰的报错）
- 退出码 2（区别于 1 的 API 错误，便于脚本化）

### 用户感受
- "老板"称呼很可爱，没有违和感
- 建议拆分提交本身也符合 git 最佳实践，是个**双赢提示**

### 候选改进方向（暂不实现）
- [ ] 超长时自动 fallback 用 `git diff --stat` 只传文件清单给 AI（Day 2 候选）
- [ ] 让用户用 `--force` 强制提交超长 diff（违反"控制复杂度"原则，**否决**）
- [ ] 阈值可配置（违反"第一阶段不做选项"原则，**否决**）

---

## 2026-05-30 · 首位用户（作者自主拆 commit，无需指导）

### 重大信号 ⭐⭐⭐
用户在收到「diff 过大」提示后，**完全自主地**拆分并完成了两次 commit，无需任何额外指导：

```
2c7ae5f feat(ai): add DeepSeek API integration for commit message generation
be5f799 feat(git): add git diff reading and commit utilities
```

### 为什么这件事重要
1. ✅ **MVP 跑通的最强证据**：用户已经形成自主使用习惯，不再依赖文档/指导
2. ✅ **产品提示文案有效**：之前的"建议拆分提交"提示真的引导用户做了正确的事
3. ✅ **AI 生成质量在第 3-4 次趋于稳定**：scope 准确（ai / git）、type 准确（feat）
4. ✅ **整个流程被验证可重复**：不是一次性运气

### AI 生成质量评分（自评）
| Commit | type | scope | subject | 综合 |
|---|---|---|---|---|
| f206fd9 | ✅ chore | ✅ init | ✅ 清晰 | A |
| f715ec4 | ⚠️ feat（应为chore） | ❌ 无 | ✅ 清晰 | B+ |
| be5f799 | ✅ feat | ✅ git | ✅ 清晰准确 | A |
| 2c7ae5f | ✅ feat | ✅ ai | ✅ 清晰准确 | A |

**结论**：4 次自举提交，3A + 1B+，**AI 生成质量超出预期**。

---

## 2026-05-30 · 首位用户（作者自测，发现长度限制的"假阳性"场景）

### 场景
单独提交 `src/cli.js`（240 行单文件），触发了 4000 字符限制（实际 6941 字符）。

### 问题
**这是合理的单文件改动，但用户无法再拆分** —— 必须整个 commit。
产品给出的建议「分批提交」在这种场景下**不适用**。

### 用户实际行为
被迫**绕过工具，手动 git commit**。
体验断点：本来一气呵成的"AI 写 message + 自动 commit"流被打断。

### 候选改进方向（Day 2/3 候选）
1. **方案 A：自动 fallback 到 `git diff --stat`** ⭐ 推荐
   - 超长时自动只传文件清单 + 函数签名给 AI
   - 提示用户："改动较大，已切换到摘要模式生成"
   - AI 仍能给出合理 message，体验不中断
2. **方案 B：传 diff 的前 N 行 + 摘要**
   - 截断但保留头部上下文
3. **方案 C：调高阈值到 8000**
   - 简单但不解决根本问题，DeepSeek 实测能吃 ~16k tokens

### 决策
- **Day 1 不改**（铁律 11）
- **Day 2 实现方案 A**（影响体验闭环，且工作量小）
- 不调阈值（治标不治本，方案 A 才是正解）

### 关键学习
> 长度限制的初衷是"防止 AI 上下文踩踏 + 防止用户提交垃圾大杂烩"，
> 但不能因此**牺牲合理的单文件改动场景**。
> 这是「严格规则 vs 用户友好」的典型冲突点，要么改规则，要么给降级方案。

---

## 2026-05-30 Day 2 · 首位用户（summary fallback 首次实战）

### 重大里程碑 ⭐⭐⭐⭐⭐
aicommit 用**新加的 summary fallback 功能**生成了一条描述**这个功能自己**的 commit message。
工具的新能力第一次被用来描述它自己的诞生过程。

### 实际输出
```
😯 老板，这次改动有点大哦（5753 字符 > 4000）
√ 怎么处理？ » 📊 切到摘要模式继续
✓ 已切换到摘要模式（2646 字符）
🤖 正在生成 commit message... ✓

feat(ai): add diff summary support for large commits

Introduce a summary-based fallback when the full diff exceeds token
limits, combining `--stat` with per-file diff heads to preserve
context without flooding the AI.
```

### 验证点
- ✅ 长度检测正常触发（5753 > 4000）
- ✅ 交互式选择菜单工作正常
- ✅ readDiffSummary 函数正确生成 2646 字符的摘要（压缩比 54%）
- ✅ AI 看到摘要后的 message 质量**完全不亚于看完整 diff**
- ✅ AI 自动加了 body 解释 why（不只是 what）
- ✅ scope 准确（ai）

### 用户感受
全程**零摩擦**：超长 → 选 → 切换 → 出结果 → 提交，整个动作流畅得像没断过。
之前 Day 1 那个"假阳性卡住手动 commit"的痛点**100% 消失**。

### 关键学习
1. 「严格规则」+「降级方案」是最佳组合
   - 默认严格（鼓励原子提交）
   - 但给用户优雅的逃生通道（不强迫拆不该拆的提交）
2. AI 看摘要也能生成高质量 message —— 摘要的"signal-to-noise"比完整 diff 更高
3. 主动询问比静默处理更尊重用户 —— 选择权交给人

## 2026-05-30 Day 2 · 测试套件落地

### 成果
- 24 个测试用例 / 267 行测试代码 / 1.5 秒全部跑完
- 覆盖 3 个核心模块：cleanMessage / config / git diff readers
- 0 失败

### 主动跳过的测试
- `generateMessage`：要联网 + 烧 token + AI 不确定性
- `cli.js` 主流程：交互式 + 副作用大
- `telemetry.js`：本就允许失败

### 关键防护
- 防 config 文件被改坏（corrupted JSON fallback）
- 防 saveConfig 写入意外字段（白名单 + 显式 assert）
- 防 staged/unstaged 优先级被改坏
- 防 AI 输出里的 code fence / quotes 漏进 commit message

### 设计决策记录
为了测试隔离，重构了 config.js：
- `CONFIG_DIR` / `CONFIG_FILE` / `PUBLIC_KEY` 从模块顶层常量改为函数
- 新增 `AICOMMIT_CONFIG_DIR` 环境变量支持
- 这是**必要的可测试性改造**，不算违反铁律 31（重构）

### 后续不打算做的
- 不引入 jest/vitest（node --test 完全够用，零依赖）
- 不追求 100% 覆盖率（违反铁律 11 第一版禁止追求完美）
- 不写 mock-heavy 的单元测试（高维护成本）

## 2026-05-30 Day 2 · 外部专家反馈（ChatGPT 产品 review）

### 反馈原文要点
1. 当前定位文案太宽泛，没差异化
2. DeepSeek 出现频率过高，用户不关心模型
3. **Telemetry 应改为 opt-in**（开发者社区红线）
4. 应该建立 commit 风格学习能力（P1 路线图）
5. 应该提供本地模式（P2 长期）
6. **必须加「为什么不是另一个 AI Commit 工具」章节**（最大转化变量）
7. **立即停止开发，开始获取真实用户**

### 决策与执行
| 建议 | 采纳？ | 行动 |
|---|---|---|
| 调整定位文案 | ✅ 采纳 | tagline 改为「停止写 update / fix bug。让 Commit History 真正可读」 |
| 弱化 DeepSeek | ✅ 采纳 | 除配置/隐私章节外，全部替换为「AI 模型」 |
| Telemetry opt-in | ✅ **强烈采纳** | 代码层默认 false + 首次运行 prompts confirm 询问 |
| Commit 风格学习 | ⏳ 入 roadmap | 不立即做（铁律 11） |
| 本地模式 | ⏳ 入 roadmap | 不立即做（铁律 11） |
| 竞品对比章节 | ✅ **强烈采纳** | 新增表格 + 「目标不是功能最多，是摩擦最小」 |
| 立即停止开发 | ✅ **核心立场采纳** | Day 2 收尾后停手，明天 push + 发帖 |

### 关键学习
- **Telemetry policy** 是社区信任的开关，错一次就再没机会
- **「为什么不用别的」** 比「我有什么功能」更值钱
- 这个反馈给出了**从工程视角看不到的市场视角**
- ChatGPT 给的建议**质量超出预期**，作为外部 review 非常有效

### 一句话总结
> 「不要卖 AI，卖结果。不要堆功能，减摩擦。」

