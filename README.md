# DSH Web Search Button (`dsh-web-search-button`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![DeepSeek Harness](https://img.shields.io/badge/Platform-DeepSeek%20Harness-blueviolet.svg)](https://github.com/deepseek-ai)
[![GitHub release](https://img.shields.io/badge/Release-v0.1.0-green.svg)](https://github.com/swenbo1-web/dsh-web-search-button)

[中文说明文档](./README.zh.md) · [GitHub Repository](https://github.com/swenbo1-web/dsh-web-search-button)

Direct web search button and `/search` host-level slash command plugin tailored for **DeepSeek Harness (DSH)** Desktop.

This plugin allows you to directly invoke the built-in host-level web search service (`ctx.web`) from the conversation input bar **without routing through the LLM**, returning real-time web search results formatted with titles, snippets, dates, and markdown source links with **0 Token overhead** in ~1 second!

---

## 🎯 Why This Plugin?

1. **Overcome Knowledge Cutoffs Instantly**  
   All LLMs have knowledge cutoffs. Standard agent search requires prompting the model, waiting for multi-step reasoning, invoking tools, and synthesizing output—often failing due to prompt drift or proxy instability.
2. **Zero LLM Overhead**  
   - Traditional Agent flow: User prompt ➔ Model thoughts ➔ Call `web_search` tool ➔ Wait for tool result ➔ Model summarizes. Costs thousands of tokens and 10–20 seconds.  
   - **This Plugin flow**: User prompt ➔ Click button ➔ Direct host execution of DeepSeek Web Search ➔ Results injected immediately. **Takes ~1 second, consumes 0 LLM tokens!**
3. **Seamless Native UI Integration**  
   Mounts cleanly in the input bar left slot (`conversation.input.left`), matching DSH `--dsw-*` design tokens, supporting dark/light mode, live draft detection, and loading states.

---

## 🖥️ UI Mockup

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   User: /search Latest AI model announcements 2026                              │
│                                                                                 │
│   🌐 **Web Search Results** (Direct Web Tool Execution):                       │
│   Query: `Latest AI model announcements 2026`                                   │
│                                                                                 │
│   ### Sources:                                                                  │
│   1. [Gemini 3.8 Flash Launch](https://...) (2026-09-02)                        │
│      > Google officially releases Gemini 3.8 Flash with tool improvements...    │
│   2. [Claude Fable 5.1 Overview](https://...) (2026-06-09)                      │
│      > Anthropic introduces Fable 5.1 optimized for coding agents...            │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Input: Latest AI model announcements 2026                                      │
│                                                                                 │
│  [+] [Standard Mode ▾]  [ 🌐 Web Search ]                              [ Send ⬆]│
│                               ▲                                                 │
│                      Plugin Search Button                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **🌐 Dedicated Composer Button**: Mounts directly into the DSH conversation input bar via `conversation.input.left` list slot.
- **⚡ Dual Invocation Modes**:
  - **Button Trigger**: Detects current composer draft text and dispatches search on click.
  - **Slash Command**: Type `/search <keyword>` directly into the input bar and press Enter.
- **🛡️ Pure Cordis Scope Lifecycle**:
  - Built with `ctx.inject(["slots", "remote.commands", "sessions"], (scope) => ...)`.
  - Automatic unmounting and cleanup on plugin reload (HMR) or disable, preventing memory leaks or orphaned DOM nodes.
- **🎨 Native Design Tokens**: Built with official `--dsw-*` CSS variables, perfectly adapting to theme changes.

---

## 🏗️ Architecture & Data Flow

```text
【 Client Plane (Browser Window) 】                 【 Host Plane (Node Engine) 】
     Composer draft: "Latest AI news"
                 │
           (Click 🌐 Button)
                 │
      Read zone.input.draft
                 │
    Via remote.commands channel
    Dispatch: "/search Latest AI news" ─────────►  Matches ctx.commands("search")
                                                              │
                                                     Directly calls host service:
                                                 ctx.web.search({ query, maxResults: 8 })
                                                              │
                                                     Formats Markdown & sources
                                                              │
   Markdown source card injected directly ◄────────────────── Injects into session
   into conversation without LLM overhead                    (command/done)
```

---

## 📂 Project Structure

```text
dsh-web-search-button/
├── src/
│   ├── index.ts              # Host-plane TypeScript source (registers /search command)
│   └── client/
│       └── index.tsx         # Client-plane TSX source (SearchButton component & scope injection)
├── lib/
│   ├── index.js              # Production Host ESM bundle
│   └── client.js             # Production Client bundle (wrapped with window.__ModuleLoader__.load)
├── cordis.patch.yml          # DSH bundle patch manifest
├── package.json              # DSH manifest (dsh.bundle.patch & dsh.client configurations)
├── tsconfig.json             # TypeScript build configuration
├── LICENSE                   # MIT License
├── README.md                 # English documentation
└── README.zh.md              # Chinese documentation
```

---

## 🚀 Installation

### Step 1: Clone or Download to Local Disk

```bash
git clone https://github.com/swenbo1-web/dsh-web-search-button.git D:/deepseek/dsh-web-search-button
```

### Step 2: Register in DSH Web Profile

DSH Desktop active profile is located at `%APPDATA%\dsh-desktop\harness\profiles\web`.

1. **Create Directory Junction**:
   Run in PowerShell:
   ```powershell
   New-Item -ItemType Junction -Path "$env:APPDATA\dsh-desktop\harness\profiles\web\node_modules\dsh-web-search-button" -Target "D:\deepseek\dsh-web-search-button"
   ```

2. **Declare Bundle in `profiles\web\package.json`**:
   Open `%APPDATA%\dsh-desktop\harness\profiles\web\package.json`, ensure `dependencies` and `dsh.profile.bundles` include `dsh-web-search-button` (save as clean UTF-8 without BOM):
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

### Step 3: Restart & Refresh

1. Right-click DSH in system tray and select **Exit**, then relaunch DSH Desktop.
2. In DSH chat window, press **`Ctrl + F5`** (hard refresh) to load the updated client bundle.
3. Check **Settings → Plugins** to see `dsh-web-search-button` enabled!

---

## 💡 Usage

### Mode 1: Composer Button & Persistent Mode Toggle
1. Open any session; the **🌐 联网搜索** button is displayed on the bottom-left of the input bar.
2. Click the button to open a non-blocking configuration popover (**can be cancelled anytime by clicking outside or on "取消", never locking the input box**):
   - Click **"✅ 开启后续自动联网搜索"**: Activates persistent Web Search Mode for this session. The button turns into an active tag `[ 🌐 联网搜索 · 已开启 ✕ ]`. All subsequent conversation questions default to using web search!
   - Click the **`✕`** icon: Cancels and exits Web Search Mode at any time.
   - If draft text is present, an option **"⚡ 立即单次检索当前输入内容"** allows immediate one-shot query execution.

### Mode 2: Slash Command
Type slash commands directly into the input bar and press Enter:
```text
/search <keyword>     # One-shot direct web search
/search on            # Enable persistent Web Search Mode for this session
/search off           # Disable Web Search Mode for this session
```

---

## 🛠️ Deep Dive: Why `scope`?

In DSH, registering slots directly on the root context (`ctx`) can cause timing crashes if dependencies aren't ready, and leaves orphaned listeners on disable.

Our implementation uses scoped dependency injection:
```typescript
export function apply(ctx: Context) {
  // Guarded: Cordis dispatches scope only when slots and remote.commands are ready
  ctx.inject(["slots", "remote.commands", "sessions"], (scope) => {
    scope.slots.inject("conversation.input.left", () =>
      scope.slots.register(
        {
          name: "conversation.input.left",
          id: "web-search-button", // List slots require unique id & order
          order: 10,
          inject: (sessionId) => ({ ... })
        },
        SearchButton
      )
    );
  });
}
```
Binding the button's lifetime to `scope` ensures clean, garbage-collected unmounting upon reload or disable.

---

## 📄 License

MIT © [swenbot](https://github.com/swenbo1-web)
