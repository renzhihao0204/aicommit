# Git Commit Message AI MVP 需求清单（3天版）
> 已采纳Gemini的3点补坑建议，所有功能严格控制在3天开发周期内

## 🎯 核心功能（唯一主功能）
输入`git diff`内容，调用DeepSeek API生成符合Conventional Commits规范的提交信息，支持一键确认提交。

---

## 🛡️ 必须实现的3个补坑方案
### 1. 匿名使用统计（解决CLI数据盲区）
- **实现逻辑**：
  - 首次运行时自动生成匿名UUID（存在本地`~/.aicommit/config`）
  - 每次成功生成commit后，异步非阻塞向Vercel Edge Function发送Ping
  - 仅发送：匿名UUID + 版本号，不收集任何代码/路径/内容信息
- **用户透明化**：
  - README明确说明匿名统计用途，不收集隐私
  - 支持`--no-telemetry`参数永久关闭统计
  - 首次运行时提示一次："工具会匿名统计使用频次帮助优化，可随时关闭"

### 2. 双轨API Key设计（解决白嫖额度耗尽问题）
- **实现逻辑**：
  - 内置公用DeepSeek API Key（预先充10元），开箱即用
  - 支持`aicommit --config key=sk_xxxx`命令配置用户自己的Key
  - 公用Key触发限流/额度用尽时，自动提示用户配置自己的Key
- **提示文案**：
  > "公用额度已被大家刷爆啦🥹 请用 `aicommit --config key=你的DeepSeek Key` 配置后继续使用，Key获取地址：xxx"

### 3. Diff长度硬限制（解决上下文踩踏问题）
- **实现逻辑**：
  - 调用API前先检查`git diff`输出字符长度
  - 阈值设为4000字符（约3000 Token，留足够余量）
  - 超过阈值直接中断，友好提示：
  > "老板，这次改动有点大哦😯 AI脑容量不够啦，请先`git add`部分文件分批提交，或者用`git diff --stat`让我只看文件清单~"

---

## 📋 最简功能清单（3天工作量）
### Day 1：核心功能
- [ ] Node.js CLI 基础框架搭建
- [ ] git diff 本地读取功能
- [ ] DeepSeek API 调用封装
- [ ] Conventional Commits 格式生成Prompt
- [ ] 命令行交互确认/修改/提交流程

### Day 2：补坑功能
- [ ] 匿名UUID生成与统计功能
- [ ] 双轨API Key配置与存储
- [ ] Diff长度检查与提示
- [ ] 错误处理（API调用失败、网络错误等）

### Day 3：发布准备
- [ ] README 编写（功能说明、安装方法、隐私说明）
- [ ] npm 包打包与发布配置
- [ ] 本地测试 + 边界case验证
- [ ] Build in Public 首发文案准备

---

## ❌ 禁止实现的功能（严格控制复杂度）
- 不做多模型支持
- 不做自定义提交格式
- 不做多语言支持
- 不做GUI界面
- 不做批量提交/多文件处理
- 不做任何账号/登录/同步功能

---

## ✅ 上线标准
- 安装即用：`npm install -g aicommit` 后直接可以用
- 核心流程：`aicommit` → 生成信息 → 回车确认 → 自动提交，全程10秒
- 所有补坑方案全部落地
- 代码量控制在500行以内
