import React, { useState } from "react";

export const inject = ["slots", "remote.commands", "sessions"] as const;

export interface ZoneProps {
  session?: {
    sessionId: string;
    [key: string]: any;
  };
  input?: {
    draft: string;
    phase?: string;
    [key: string]: any;
  };
}

export interface SearchButtonProps {
  zone?: ZoneProps;
  input?: {
    draft: string;
    [key: string]: any;
  };
  session?: {
    sessionId: string;
    [key: string]: any;
  };
  sessionId?: string;
  onSearch?: (query: string, sid?: string) => Promise<any>;
}

export function SearchButton(props: SearchButtonProps) {
  const [busy, setBusy] = useState(false);

  const inputObj = props.input ?? props.zone?.input;
  const draft = (typeof inputObj?.draft === "string" ? inputObj.draft : "").trim();
  const sessionObj = props.session ?? props.zone?.session;
  const currentSessionId = sessionObj?.sessionId ?? props.sessionId;
  const canRun = typeof props.onSearch === "function";

  const handleSearch = async () => {
    const activeInput = props.input ?? props.zone?.input;
    const activeDraft = (typeof activeInput?.draft === "string" ? activeInput.draft : "").trim();

    if (!activeDraft) {
      alert("请先在输入框中输入你想搜索的关键词或问题，然后再点击「联网搜索」！");
      return;
    }
    if (busy || !canRun) return;

    setBusy(true);
    try {
      await props.onSearch!(activeDraft, currentSessionId);
    } catch (error: any) {
      console.error("[dsh-web-search-button] search trigger error:", error);
      alert("搜索执行失败：" + (error?.message || String(error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="dsh-web-search-btn"
      title={draft ? `点击联网搜索：“${draft}”` : "点击直接调用网络工具检索（需先在输入框输入内容）"}
      onClick={handleSearch}
      disabled={busy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        height: "28px",
        padding: "0 10px",
        borderRadius: "14px",
        border: "1px solid var(--dsw-alias-border-l2, #e0e0e0)",
        backgroundColor: busy
          ? "var(--dsw-alias-interactive-bg-active, #eaeaea)"
          : draft
          ? "var(--dsw-alias-button-info-fill, #3b82f6)"
          : "var(--dsw-alias-interactive-bg, rgba(0,0,0,0.05))",
        color: draft
          ? "#ffffff"
          : "var(--dsw-alias-label-secondary, #666666)",
        fontSize: "12px",
        fontWeight: 500,
        lineHeight: "20px",
        cursor: busy ? "wait" : "pointer",
        transition: "all 0.15s ease-in-out",
        userSelect: "none",
        outline: "none",
      }}
    >
      <span style={{ fontSize: "13px" }}>🌐</span>
      <span>{busy ? "搜索中..." : "联网搜索"}</span>
    </button>
  );
}

/**
 * Client-plane plugin entry:
 * Demonstrates proper Cordis scope lifecycle management.
 * Registers the button into the input bar left slot only when dependencies are ready.
 */
export function apply(ctx: any) {
  ctx.inject(["slots", "remote.commands", "sessions"], (scope: any) => {
    scope.slots.inject("conversation.input.left", () =>
      scope.slots.register(
        {
          name: "conversation.input.left",
          id: "web-search-button",
          order: 10,
          inject: (sessionId: string) => ({
            sessionId,
            onSearch: async (query: string, sid?: string) => {
              const targetId = sid ?? sessionId;
              if (!targetId) {
                throw new Error("No active session ID available to dispatch search");
              }

              // Method 1: Use direct remote command execution channel if available
              const remote = scope.remote ?? ctx.remote;
              if (remote?.commands?.execute) {
                const res = await remote.commands.execute(targetId, `/search ${query}`, []);
                if (res && !res.ok) {
                  throw new Error(res.error?.message || "Command execution failed");
                }
                return res;
              }

              // Method 2: Fallback to session.prompt
              const sessions = scope.sessions ?? ctx.sessions;
              const binding = sessions?.binding?.(targetId);
              const session = binding?.session;
              if (!session) {
                throw new Error(`Session binding not found for ID: ${targetId}`);
              }
              return session.prompt(
                [
                  {
                    type: "text",
                    text: `/search ${query}`,
                  },
                ],
                "queue"
              );
            },
          }),
        },
        SearchButton
      )
    );
  });
}
