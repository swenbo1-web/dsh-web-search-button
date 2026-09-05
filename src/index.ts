/**
 * Host-plane plugin for dsh-web-search-button:
 * 1. Registers the human-facing `/search` command over `ctx.web`
 * 2. Supports `/search on` and `/search off` to toggle persistent Web Search Mode
 * 3. Injects system prompt guidance when Web Search Mode is active for a session
 */

export const name = "dsh-web-search-button";
export const inject = ["commands", "web", "systemPrompt"] as const;

interface WebSearchSource {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: string;
}

interface WebSearchResult {
  content?: string;
  sources: WebSearchSource[];
  truncated?: boolean;
}

interface CommandInvocation {
  rawInput: string;
  agent?: {
    session?: {
      sessionId?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  signal: AbortSignal;
  commandId?: string;
}

interface CommandOutcome {
  kind: "success" | "error";
  text: string;
  sourceEventSeq?: number;
}

// Set of session IDs that currently have Web Search Mode turned on
const activeSearchSessions = new Set<string>();

const SEARCH_MODE_PROMPT = `【联网搜索模式已开启】
针对用户提出的任何涉及时效性、最新事实、软件版本、时事新闻或需要核实的内容，你必须优先调用 \`web_search\` 工具进行实时网络搜索，并结合搜索到的最新结果回答用户。不要仅依赖已有记忆。`;

const EXTERNAL_NOTICE = "🌐 **网络搜索结果**（直接调用网页检索工具）：";

function formatSources(sources: WebSearchSource[]): string {
  if (sources.length === 0) return "未找到相关网页结果。";
  const items = sources.map((s, idx) => {
    const title = s.title && s.title.trim() ? s.title.trim() : s.url;
    const snippet = s.snippet ? `\n  > ${s.snippet.trim()}` : "";
    const date = s.publishedAt ? ` *(${s.publishedAt})*` : "";
    return `${idx + 1}. [${title}](${s.url})${date}${snippet}`;
  });
  return `### 参考来源：\n${items.join("\n\n")}`;
}

function formatOutput(query: string, result: WebSearchResult): string {
  const parts: string[] = [EXTERNAL_NOTICE, `**搜索词**：\`${query}\``];
  if (result.content && result.content.trim()) {
    parts.push(result.content.trim());
  }
  parts.push(formatSources(result.sources));
  if (result.truncated) {
    parts.push("*(已截断显示前部分搜索结果)*");
  }
  return parts.join("\n\n");
}

async function executeSearch(ctx: any, invocation: CommandInvocation): Promise<CommandOutcome> {
  const query = invocation.rawInput.trim();
  const sessionId = invocation.agent?.session?.sessionId;

  // Mode toggles
  if (query === "on") {
    if (sessionId) activeSearchSessions.add(sessionId);
    return {
      kind: "success",
      text: "🌐 **联网搜索模式已开启**。后续对话中，针对时效性或需要核实的问题，模型将默认优先调用网页检索工具。",
    };
  }

  if (query === "off") {
    if (sessionId) activeSearchSessions.delete(sessionId);
    return {
      kind: "success",
      text: "🌐 **联网搜索模式已关闭**。后续对话已恢复普通模式。",
    };
  }

  if (!query) {
    return {
      kind: "error",
      text: "用法：`/search <搜索内容>` 或 `/search on` / `/search off`。",
    };
  }

  try {
    const result: WebSearchResult = await ctx.web.search(
      {
        query,
        maxResults: 8,
      },
      invocation.signal
    );

    return {
      kind: "success",
      text: formatOutput(query, result),
    };
  } catch (error: any) {
    if (invocation.signal?.aborted) {
      return {
        kind: "error",
        text: "搜索已被取消。",
      };
    }
    return {
      kind: "error",
      text: `网页检索执行失败：${error?.message || String(error)}`,
    };
  }
}

export function apply(ctx: any) {
  const active = new Set<Promise<any>>();

  // 1. Dynamic System Prompt Section
  ctx.systemPrompt.section({
    name: "tool:web_search_mode",
    order: 550,
    text: (context: any) => {
      const sessionId = context?.agent?.session?.sessionId;
      if (sessionId && activeSearchSessions.has(sessionId)) {
        return SEARCH_MODE_PROMPT;
      }
      return "";
    },
  });

  // 2. Command handler for /search
  const handler = (invocation: CommandInvocation) => {
    const operation = executeSearch(ctx, invocation);
    active.add(operation);
    const retire = () => active.delete(operation);
    operation.then(retire, retire);
    return operation;
  };

  ctx.effect(function* () {
    yield async () => {
      await Promise.allSettled(active);
    };
    yield ctx.commands.register({
      name: "search",
      description: "直接调用网络工具进行网页检索，或管理联网搜索模式 (/search on|off)",
      handler,
    });
  }, "dsh-web-search-button host lifecycle");
}
