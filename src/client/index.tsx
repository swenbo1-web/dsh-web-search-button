import React, { useState, useEffect } from "react";

export const inject = ["slots", "remote.commands", "sessions"] as const;

export interface ZoneProps {
  session?: {
    sessionId: string;
    [key: string]: any;
  };
  input?: {
    draft: string;
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
  onExecuteCommand?: (cmd: string, sid?: string) => Promise<any>;
}

export function SearchButton(props: SearchButtonProps) {
  const sessionObj = props.session ?? props.zone?.session;
  const currentSessionId = sessionObj?.sessionId ?? props.sessionId;

  // Session-bound active state
  const [active, setActive] = useState<boolean>(() => {
    if (!currentSessionId) return false;
    try {
      return localStorage.getItem(`dsh.webSearchMode.${currentSessionId}`) === "true";
    } catch {
      return false;
    }
  });

  // Re-sync state when session changes
  useEffect(() => {
    if (!currentSessionId) return;
    try {
      const stored = localStorage.getItem(`dsh.webSearchMode.${currentSessionId}`) === "true";
      setActive(stored);
    } catch {}
  }, [currentSessionId]);

  // Smoothly restore focus to Lexical text input
  const restoreFocus = () => {
    setTimeout(() => {
      const editor = document.querySelector<HTMLDivElement>('[contenteditable="true"]');
      if (editor) {
        editor.focus();
      }
    }, 20);
  };

  // Pure click toggle: Click -> Lit up (常亮), Click again -> Dimmed (变暗)
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const next = !active;
    setActive(next);

    if (currentSessionId) {
      try {
        localStorage.setItem(`dsh.webSearchMode.${currentSessionId}`, next ? "true" : "false");
      } catch {}

      // Silently toggle host session mode
      if (props.onExecuteCommand) {
        props.onExecuteCommand(next ? "/search on" : "/search off", currentSessionId).catch((err) => {
          console.error("[dsh-web-search-button] toggle command failed:", err);
        });
      }
    }

    restoreFocus();
  };

  return (
    <button
      type="button"
      className={`dsh-web-search-toggle ${active ? "active" : ""}`}
      title={active ? "联网搜索模式已开启（常亮）：点击关闭（变暗）" : "联网搜索模式已关闭（变暗）：点击开启（常亮）"}
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        height: "26px",
        padding: "0 10px",
        borderRadius: "13px",
        border: active
          ? "1px solid var(--dsw-alias-brand-primary, #10a37f)"
          : "1px solid var(--dsw-alias-border-l2, #d1d5db)",
        backgroundColor: active
          ? "var(--dsw-alias-brand-primary, #10a37f)"
          : "var(--dsw-alias-interactive-bg, rgba(0, 0, 0, 0.04))",
        color: active
          ? "#ffffff"
          : "var(--dsw-alias-label-secondary, #4b5563)",
        fontSize: "12px",
        fontWeight: active ? 600 : 500,
        lineHeight: "20px",
        cursor: "pointer",
        transition: "all 0.15s ease-in-out",
        boxShadow: active
          ? "0 0 8px rgba(16, 163, 127, 0.4)"
          : "none",
        userSelect: "none",
        outline: "none",
      }}
    >
      <span style={{ fontSize: "13px", opacity: active ? 1 : 0.85 }}>🌐</span>
      <span>联网搜索</span>
    </button>
  );
}

/**
 * Client-plane plugin entry:
 * Mounts the search toggle button in the input bar left slot.
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
            onExecuteCommand: async (cmd: string, sid?: string) => {
              const targetId = sid ?? sessionId;
              if (!targetId) return;

              // Direct remote commands execution channel
              const remote = scope.remote ?? ctx.remote;
              if (remote?.commands?.execute) {
                return remote.commands.execute(targetId, cmd, []);
              }

              // Fallback to session.prompt
              const sessions = scope.sessions ?? ctx.sessions;
              const binding = sessions?.binding?.(targetId);
              const session = binding?.session;
              if (session) {
                return session.prompt([{ type: "text", text: cmd }], "queue");
              }
            },
          }),
        },
        SearchButton
      )
    );
  });
}
