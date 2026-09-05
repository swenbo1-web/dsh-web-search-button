# DSH 联网搜索按钮插件 (`dsh-web-search-button`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![DeepSeek Harness](https://img.shields.io/badge/Platform-DeepSeek%20Harness-blueviolet.svg)](https://github.com/deepseek-ai)
[![GitHub release](https://img.shields.io/badge/Release-v0.1.0-green.svg)](https://github.com/swenbo1-web/dsh-web-search-button)

[English Documentation](./README.md) · [GitHub 仓库](https://github.com/swenbo1-web/dsh-web-search-button)

专为 **DeepSeek Harness (DSH)** 桌面端深度打造的**对话输入栏网页搜索按钮**与 **`/search` 宿主斜杠命令**插件。

无需经历大模型的复杂思考与多轮工具调用，在输入框敲下关键词后，**点击按钮即可直接触发底层真实网页检索**，0 Token 模型消耗，秒级将带有标题、摘要、日期及 Markdown 链接的权威搜索结果注入会话！

---

## 🎯 为什么需要这个插件？

1. **解决大模型知识截止期（Knowledge Cutoff）困扰**  
   任何大模型（包括本地 API、Google Gemini、DeepSeek 等）知识库均有截止时间。常规解决方式需要模型自身具备联网工具并在提示词引导下多轮尝试，极易因为模型配置、代理不稳定或提示词偏差导致搜索失败。
2. **零模型推理开销（Zero LLM Overhead）**  
   普通智能体搜索流程：用户输入 ➔ 模型推理思考 ➔ 决定调用 `web_search` 工具 ➔ 拿到搜索结果 ➔ 再次推理总结。这一套下来消耗成千上万 Token，耗时十几秒。  
   **本插件流程**：用户输入 ➔ 点击按钮 ➔ 宿主直接调取 DeepSeek 联网检索接口 ➔ 格式化注入会话。**耗时仅 1 秒左右，完全不烧模型 Token！**
3. **原生无缝交互**  
   通过 DSH 插槽协议直接挂载在输入框底部左侧，与官方 UI 样式完全统一，支持实时加载状态、禁用态切换及快捷斜杠命令。
4. **根治模型“偷懒与幻觉”（为什么需要强制常亮开关？）**  
   很多人会疑问：*“如果部分具备 Agent 能力的模型在特定情况下也会自动调用搜索工具，为什么还需要这个开关？”*  
   - **消除认知自负与幻觉**：大模型（尤其在未设定强指令时）极其容易产生“认知偷懒”——误以为自己训练数据里的旧知识就是事实，直接编造过时回答，根本不主动触发网络工具。
   - **100% 确定性强制约束**：一旦将开关置于【常亮】状态，宿主会为当前会话注入系统级指令约束（System Prompt），强制模型在面对事实、时效性、版本与新闻问题时**必须先进行真实联网检索，绝不允许凭记忆臆测**！
   - **零摩擦灵活控制**：不需要时再次点击按钮即可【变暗】，立刻恢复常规对话，兼顾自由度与回答的绝对真实性。

---

## 🖥️ 界面效果示意图

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   用户: /search 2026年最新AI大模型发布进展                                       │
│                                                                                 │
│   🌐 网络搜索结果（直接调用网页检索工具）：                                        │
│   搜索词：`2026年最新AI大模型发布进展`                                           │
│                                                                                 │
│   ### 参考来源：                                                                │
│   1. [Gemini 3.8 Flash 发布公告](https://...) (2026-09-02)                     │
│      > Google 今日正式推送 Gemini 3.8 Flash 模型，主打极速推理与工具调用优化...     │
│   2. [Claude Fable 5.1 上线介绍](https://...) (2026-06-09)                     │
│      > Anthropic 推出针对编码优化的最新模型...                                    │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  输入框：2026年最新AI大模型发布进展                                              │
│                                                                                 │
│  [+] [标准模式 ▾]  [ 🌐 联网搜索 ]                                     [ 发送 ⬆ ]│
│                       ▲                                                         │
│                  插件专属按钮                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ 核心特性

- **🌐 专属按钮挂载**：严格遵循 DSH 客户端插槽规范，挂载至 `conversation.input.left` 列表插槽。
- **⚡ 双通道触发**：
  - **点击按钮**：自动读取当前输入框草稿（Draft）并发起检索。
  - **斜杠命令**：在任何会话中直接键入 `/search <关键词>` 回车执行。
- **🛡️ 纯正 Cordis Scope 架构**：
  - 基于 `ctx.inject(["slots", "remote.commands", "sessions"], (scope) => ...)` 构建。
  - 当插件停用或热更新时，由框架全自动回收插槽与事件监听器，绝无内存泄露与幽灵残留。
- **🎨 原生主题适配**：使用 DSH 官方 `--dsw-*` 色彩设计变量，完美自适应日间/夜间模式。

---

## 🏗️ 运行架构与数据流

```text
【 浏览器 / 客户端 (Client Plane) 】               【 DSH 宿主后台 (Host Plane) 】
      输入框草稿: "最新开源模型"
                 │
           (点击 🌐 按钮)
                 │
     读取 zone.input.draft
                 │
    通过 remote.commands 通道
  发出: "/search 最新开源模型" ──────────────►  命中 ctx.commands.register("search")
                                                          │
                                                    直接调用底层网络服务:
                                                 ctx.web.search({ query, maxResults: 8 })
                                                          │
                                                    格式化 Markdown 与参考来源
                                                          │
   带有标题、摘要、外链的 Markdown 卡片 ◄──────────────── 写入当前会话 (command/done)
   无需模型推理，即刻呈现
```

---

## 📂 项目工程结构

```text
dsh-web-search-button/
├── src/
│   ├── index.ts              # 宿主侧 TypeScript 源码（/search 命令注册与 web.search 调用）
│   └── client/
│       └── index.tsx         # 客户端 TSX 源码（SearchButton 组件与 scope 插槽注入）
├── lib/
│   ├── index.js              # 宿主 ESM 生产级标准运行产物
│   └── client.js             # 客户端生产产物（遵循 window.__ModuleLoader__.load 规范）
├── cordis.patch.yml          # DSH Bundle 插件依赖注入清单
├── package.json              # 符合 DSH 规范的包定义文件（含 dsh.bundle & dsh.client 配置）
├── tsconfig.json             # TypeScript 构建配置文件
├── LICENSE                   # MIT 开源授权协议
├── README.md                 # 英文官方文档
└── README.zh.md              # 中文说明文档
```

---

## 🚀 安装部署指南

### 第一步：克隆或下载插件到本地

```bash
git clone https://github.com/swenbo1-web/dsh-web-search-button.git D:/deepseek/dsh-web-search-button
```

### 第二步：在 DSH 的 Web Profile 中激活

DSH 桌面版的活跃配置文件位于：`%APPDATA%\dsh-desktop\harness\profiles\web`。

1. **建立符号链接（Junction）**：
   在 PowerShell 中运行：
   ```powershell
   New-Item -ItemType Junction -Path "$env:APPDATA\dsh-desktop\harness\profiles\web\node_modules\dsh-web-search-button" -Target "D:\deepseek\dsh-web-search-button"
   ```

2. **在 `profiles\web\package.json` 中登记 Bundle**：
   打开 `%APPDATA%\dsh-desktop\harness\profiles\web\package.json`，确保 `dependencies` 和 `dsh.profile.bundles` 中包含该插件（注意使用纯净无 BOM 的 UTF-8 编码保存）：
   ```json
   {
     "dependencies": {
       "dsh-web-search-button": "link:D:/deepseek/dsh-web-search-button"
     },
     "dsh": {
       "profile": {
         "bundles": [
           "@deepseek-ai/dsh-base",
           "@deepseek-ai/dsh-web-app",
           "dsh-web-search-button"
         ]
       }
     }
   }
   ```

### 第三步：重启与刷新

1. 在电脑右下角系统托盘中，**完全退出 DSH Desktop**，然后重新启动它。
2. 进入 DSH 窗口，在对话页面按 **`Ctrl + F5`**（强制刷新），确保前端加载最新的资源包。
3. 点击左下角 **设置 → 插件**，即可看到 `dsh-web-search-button` 正式加载成功！

---

## 💡 使用方法

### 方式 1：输入框开关直接切换（常亮 / 变暗）
1. 打开任意对话，输入框左下方将显示 **`[ 🌐 联网搜索 ]`** 按钮；
2. **点击一下 ➔ 按钮直接常亮**（高亮绿色背景 + 白色文字 + 微发光效果）：
   - 代表**联网搜索已开启**；
   - 无需任何弹窗或确认提示词，后续对话中针对时效性或技术问题，模型将全自动调用 `web_search` 检索实时信息；
   - 绝不阻塞焦点，输入框始终保持流畅输入；
3. **再次点击 ➔ 按钮直接变暗**（灰底弱化效果）：
   - 代表**联网搜索已关闭**，后续对话恢复常规模式。

### 方式 2：斜杠命令触发
在对话输入框中直接输入：
```text
/search 你的搜索关键词      # 单次直接检索并注入结果
/search on                  # 开启当前会话的持续联网搜索模式（常亮）
/search off                 # 关闭当前会话的联网搜索模式（变暗）
```

---

## 🛠️ 技术深度：为什么要用 `scope`？

在 DSH 的插件体系中，直接在根 Context (`ctx`) 上盲目注册插槽具有高风险：若依赖未就绪会报错，若插件被禁用会残留 DOM 节点。

本插件的实现范式：
```typescript
export function apply(ctx: Context) {
  // 依赖守卫：只有当 slots（插槽服务）和 remote.commands（命令总线）完全就绪后，Cordis 才派发 scope
  ctx.inject(["slots", "remote.commands", "sessions"], (scope) => {
    scope.slots.inject("conversation.input.left", () =>
      scope.slots.register(
        {
          name: "conversation.input.left",
          id: "web-search-button", // list 类型插槽必须提供唯一 id
          order: 10,
          inject: (sessionId) => ({ ... })
        },
        SearchButton
      )
    );
  });
}
```
通过将按钮生命周期深绑定于该 `scope`，无论是会话销毁、插件热重载还是手动停用，宿主均可自动执行反注册，确保系统纯净稳定。

---

## 📄 开源协议

本项目采用 [MIT 许可证](./LICENSE) 开源。欢迎提交 PR 和 Issue！
