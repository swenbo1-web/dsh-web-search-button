/**
 * Production ESM bundle for DSH Host plane: dsh-web-search-button
 */

export const name = "dsh-web-search-button";
export const inject = ["commands", "web"];

const EXTERNAL_NOTICE = "🌐 **网络搜索结果**（直接调用网页检索工具）：";

function formatSources(sources) {
  if (!sources || sources.length === 0) return "未找到相关网页结果。";
  const items = sources.map((s, idx) => {
    const title = s.title && s.title.trim() ? s.title.trim() : s.url;
    const snippet = s.snippet ? `\n  > ${s.snippet.trim()}` : "";
    const date = s.publishedAt ? ` *(${s.publishedAt})*` : "";
    return `${idx + 1}. [${title}](${s.url})${date}${snippet}`;
  });
  return `### 参考来源：\n${items.join("\n\n")}`;
}

function formatOutput(query, result) {
  const parts = [EXTERNAL_NOTICE, `**搜索词**：\`${query}\``];
  if (result.content && result.content.trim()) {
    parts.push(result.content.trim());
  }
  parts.push(formatSources(result.sources));
  if (result.truncated) {
    parts.push("*(已截断显示前部分搜索结果)*");
  }
  return parts.join("\n\n");
}

async function executeSearch(ctx, invocation) {
  const query = invocation.rawInput.trim();
  if (!query) {
    return {
      kind: "error",
      text: "用法：`/search <搜索内容>`。请在命令后输入你想搜索的关键词。",
    };
  }

  try {
    const result = await ctx.web.search(
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
  } catch (error) {
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

export function apply(ctx) {
  const active = new Set();

  const handler = (invocation) => {
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
      description: "直接调用网络工具进行网页检索并将结果注入会话",
      handler,
    });
  }, "dsh-web-search-button host lifecycle");
}
