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
  sessionId?: string;
  onSearch?: (query: string, sid?: string) => Promise<any>;
}

export function SearchButton({ zone, sessionId, onSearch }: SearchButtonProps) {
  const [busy, setBusy] = useState(false);
  const draft = zone?.input?.draft?.trim() ?? "";
  const currentSessionId = zone?.session?.sessionId ?? sessionId;
  const disabled = busy || !draft || !onSearch;

  const handleSearch = async () => {
    if (disabled || !onSearch) return;
    setBusy(true);
    try {
      await onSearch(draft, currentSessionId);
    } catch (error) {
      console.error("[dsh-web-search-button] search trigger error:", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="dsh-web-search-btn"
      title={draft ? `联网搜索：“${draft}”` : "在输入框输入内容后点击联网搜索"}
      onClick={handleSearch}
      disabled={disabled}
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
          : "var(--dsw-alias-interactive-bg, transparent)",
        color: disabled
          ? "var(--dsw-alias-label-dimmed, #999)"
          : "var(--dsw-alias-label-secondary, #333)",
        fontSize: "12px",
        fontWeight: 500,
        lineHeight: "20px",
        cursor: disabled ? "not-allowed" : "pointer",
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
              if (scope.remote?.commands?.execute) {
                const res = await scope.remote.commands.execute(targetId, `/search ${query}`, []);
                if (res && !res.ok) {
                  throw new Error(res.error?.message || "Command execution failed");
                }
                return res;
              }

              // Method 2: Fallback to session.prompt
              const binding = scope.sessions?.binding?.(targetId);
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
