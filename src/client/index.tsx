import React, { useState, useEffect, useRef } from "react";

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
  onExecuteCommand?: (cmd: string, sid?: string) => Promise<any>;
}

export function SearchButton(props: SearchButtonProps) {
  const [busy, setBusy] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const inputObj = props.input ?? props.zone?.input;
  const draft = (typeof inputObj?.draft === "string" ? inputObj.draft : "").trim();
  const sessionObj = props.session ?? props.zone?.session;
  const currentSessionId = sessionObj?.sessionId ?? props.sessionId;

  // Persisted mode state per session
  const [modeActive, setModeActive] = useState<boolean>(() => {
    if (!currentSessionId) return false;
    try {
      return localStorage.getItem(`dsh.webSearchMode.${currentSessionId}`) === "true";
    } catch {
      return false;
    }
  });

  // Keep state updated if session changes
  useEffect(() => {
    if (!currentSessionId) return;
    try {
      const stored = localStorage.getItem(`dsh.webSearchMode.${currentSessionId}`) === "true";
      setModeActive(stored);
    } catch {}
  }, [currentSessionId]);

  // Restore Lexical editor focus smoothly
  const restoreFocus = () => {
    setTimeout(() => {
      const editor = document.querySelector<HTMLDivElement>('[contenteditable="true"]');
      if (editor) {
        editor.focus();
      }
    }, 50);
  };

  // Click outside to dismiss popover
  useEffect(() => {
    if (!popoverOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
        restoreFocus();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [popoverOpen]);

  // Enable persistent Web Search Mode
  const handleEnableMode = async () => {
    setPopoverOpen(false);
    if (!currentSessionId || busy) return;
    setBusy(true);
    try {
      if (props.onExecuteCommand) {
        await props.onExecuteCommand("/search on", currentSessionId);
      }
      setModeActive(true);
      try {
        localStorage.setItem(`dsh.webSearchMode.${currentSessionId}`, "true");
      } catch {}
    } catch (err) {
      console.error("[dsh-web-search-button] enable mode failed:", err);
    } finally {
      setBusy(false);
      restoreFocus();
    }
  };

  // Disable / Cancel persistent Web Search Mode
  const handleDisableMode = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPopoverOpen(false);
    if (!currentSessionId || busy) return;
    setBusy(true);
    try {
      if (props.onExecuteCommand) {
        await props.onExecuteCommand("/search off", currentSessionId);
      }
      setModeActive(false);
      try {
        localStorage.removeItem(`dsh.webSearchMode.${currentSessionId}`);
      } catch {}
    } catch (err) {
      console.error("[dsh-web-search-button] disable mode failed:", err);
    } finally {
      setBusy(false);
      restoreFocus();
    }
  };

  // Execute instant one-shot search for current draft
  const handleInstantSearch = async () => {
    setPopoverOpen(false);
    if (!draft || !currentSessionId || busy) {
      restoreFocus();
      return;
    }
    setBusy(true);
    try {
      if (props.onExecuteCommand) {
        await props.onExecuteCommand(`/search ${draft}`, currentSessionId);
      }
    } catch (err) {
      console.error("[dsh-web-search-button] instant search failed:", err);
    } finally {
      setBusy(false);
      restoreFocus();
    }
  };

  return (
    <div
      ref={rootRef}
      className="dsh-web-search-wrapper"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {modeActive ? (
        // Active State: Chip with '✕' cancel button
        <span
          className="dsh-web-search-chip"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            height: "26px",
            padding: "0 8px 0 10px",
            borderRadius: "13px",
            border: "1px solid var(--dsw-alias-brand-primary, #10a37f)",
            backgroundColor: "var(--dsw-alias-brand-primary, #10a37f)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 500,
            lineHeight: "20px",
            userSelect: "none",
          }}
        >
          <span style={{ fontSize: "13px" }}>🌐</span>
          <span>联网搜索 · 已开启</span>
          <button
            type="button"
            title="点击取消并关闭联网搜索模式"
            onClick={handleDisableMode}
            disabled={busy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: "rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              fontSize: "11px",
              cursor: "pointer",
              marginLeft: "2px",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </span>
      ) : (
        // Default State: Trigger button
        <button
          type="button"
          className="dsh-web-search-trigger"
          title="点击配置联网搜索（可开启后续对话自动搜索或单次检索）"
          onClick={() => {
            setPopoverOpen((prev) => !prev);
          }}
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
            backgroundColor: popoverOpen
              ? "var(--dsw-alias-interactive-bg-active, #eaeaea)"
              : "var(--dsw-alias-interactive-bg, transparent)",
            color: "var(--dsw-alias-label-secondary, #333)",
            fontSize: "12px",
            fontWeight: 500,
            lineHeight: "20px",
            cursor: "pointer",
            transition: "all 0.15s ease-in-out",
            userSelect: "none",
            outline: "none",
          }}
        >
          <span style={{ fontSize: "13px" }}>🌐</span>
          <span>联网搜索</span>
        </button>
      )}

      {/* Non-blocking in-page Popover */}
      {popoverOpen && (
        <div
          className="dsh-web-search-popover"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            zIndex: 1000,
            minWidth: "260px",
            maxWidth: "320px",
            padding: "12px 14px",
            borderRadius: "10px",
            backgroundColor: "var(--dsw-alias-bg-layer-2, #ffffff)",
            border: "1px solid var(--dsw-alias-border-l2, #e0e0e0)",
            boxShadow: "0 4px 18px rgba(0, 0, 0, 0.15)",
            color: "var(--dsw-alias-label-primary, #111111)",
            fontFamily: "var(--dsw-font-family, sans-serif)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "13px" }}>🌐 联网搜索模式</span>
            <button
              type="button"
              title="关闭"
              onClick={() => {
                setPopoverOpen(false);
                restoreFocus();
              }}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "14px",
                color: "var(--dsw-alias-label-tertiary, #999999)",
                padding: "2px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "12px",
              lineHeight: "18px",
              color: "var(--dsw-alias-label-secondary, #666666)",
            }}
          >
            开启后，当前会话的所有后续提问将<strong>默认自动调用网页检索</strong>获取实时信息。
          </p>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {draft && (
              <button
                type="button"
                onClick={handleInstantSearch}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  height: "30px",
                  borderRadius: "6px",
                  border: "1px solid var(--dsw-alias-brand-primary, #10a37f)",
                  backgroundColor: "var(--dsw-alias-brand-primary, #10a37f)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <span>⚡ 立即检索当前输入内容</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleEnableMode}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                height: "30px",
                borderRadius: "6px",
                border: "1px solid var(--dsw-alias-border-l3, #cccccc)",
                backgroundColor: "var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.05))",
                color: "var(--dsw-alias-label-primary, #111111)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <span>✅ 开启后续自动联网搜索</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                restoreFocus();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "26px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "transparent",
                color: "var(--dsw-alias-label-tertiary, #888888)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Client-plane plugin entry:
 * Registers the search button into conversation.input.left with proper id & order.
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
              if (!targetId) {
                throw new Error("No active session ID available to dispatch search");
              }

              // Direct remote commands execution channel
              const remote = scope.remote ?? ctx.remote;
              if (remote?.commands?.execute) {
                const res = await remote.commands.execute(targetId, cmd, []);
                if (res && !res.ok) {
                  throw new Error(res.error?.message || "Command execution failed");
                }
                return res;
              }

              // Fallback to session.prompt
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
                    text: cmd,
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
