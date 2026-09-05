window.__ModuleLoader__.load({
  id: "dsh-web-search-button",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var react = require("react");
    var inject = ["slots", "remote.commands", "sessions"];

    function SearchButton(props) {
      var busyState = react.useState(false);
      var busy = busyState[0];
      var setBusy = busyState[1];

      var popoverState = react.useState(false);
      var popoverOpen = popoverState[0];
      var setPopoverOpen = popoverState[1];

      var rootRef = react.useRef(null);

      var inputObj = props.input || (props.zone && props.zone.input);
      var draft = (inputObj && typeof inputObj.draft === "string" ? inputObj.draft : "").trim();
      var sessionObj = props.session || (props.zone && props.zone.session);
      var currentSessionId = (sessionObj && sessionObj.sessionId) || props.sessionId;

      var modeState = react.useState(function () {
        if (!currentSessionId) return false;
        try {
          return localStorage.getItem("dsh.webSearchMode." + currentSessionId) === "true";
        } catch (e) {
          return false;
        }
      });
      var modeActive = modeState[0];
      var setModeActive = modeState[1];

      react.useEffect(function () {
        if (!currentSessionId) return;
        try {
          var stored = localStorage.getItem("dsh.webSearchMode." + currentSessionId) === "true";
          setModeActive(stored);
        } catch (e) {}
      }, [currentSessionId]);

      var restoreFocus = function () {
        setTimeout(function () {
          var editor = document.querySelector('[contenteditable="true"]');
          if (editor) {
            editor.focus();
          }
        }, 50);
      };

      react.useEffect(function () {
        if (!popoverOpen) return;
        var handleMouseDown = function (e) {
          if (rootRef.current && !rootRef.current.contains(e.target)) {
            setPopoverOpen(false);
            restoreFocus();
          }
        };
        document.addEventListener("mousedown", handleMouseDown);
        return function () {
          document.removeEventListener("mousedown", handleMouseDown);
        };
      }, [popoverOpen]);

      var handleEnableMode = function () {
        setPopoverOpen(false);
        if (!currentSessionId || busy) return;
        setBusy(true);
        Promise.resolve(
          props.onExecuteCommand ? props.onExecuteCommand("/search on", currentSessionId) : null
        )
          .then(function () {
            setModeActive(true);
            try {
              localStorage.setItem("dsh.webSearchMode." + currentSessionId, "true");
            } catch (e) {}
          })
          .catch(function (err) {
            console.error("[dsh-web-search-button] enable mode failed:", err);
          })
          .finally(function () {
            setBusy(false);
            restoreFocus();
          });
      };

      var handleDisableMode = function (e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        setPopoverOpen(false);
        if (!currentSessionId || busy) return;
        setBusy(true);
        Promise.resolve(
          props.onExecuteCommand ? props.onExecuteCommand("/search off", currentSessionId) : null
        )
          .then(function () {
            setModeActive(false);
            try {
              localStorage.removeItem("dsh.webSearchMode." + currentSessionId);
            } catch (e) {}
          })
          .catch(function (err) {
            console.error("[dsh-web-search-button] disable mode failed:", err);
          })
          .finally(function () {
            setBusy(false);
            restoreFocus();
          });
      };

      var handleInstantSearch = function () {
        setPopoverOpen(false);
        var activeInput = props.input || (props.zone && props.zone.input);
        var activeDraft = (activeInput && typeof activeInput.draft === "string" ? activeInput.draft : "").trim();
        if (!activeDraft || !currentSessionId || busy) {
          restoreFocus();
          return;
        }
        setBusy(true);
        Promise.resolve(
          props.onExecuteCommand ? props.onExecuteCommand("/search " + activeDraft, currentSessionId) : null
        )
          .catch(function (err) {
            console.error("[dsh-web-search-button] instant search failed:", err);
          })
          .finally(function () {
            setBusy(false);
            restoreFocus();
          });
      };

      var triggerElem;
      if (modeActive) {
        triggerElem = react.createElement(
          "span",
          {
            className: "dsh-web-search-chip",
            style: {
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
            },
          },
          react.createElement("span", { style: { fontSize: "13px" } }, "🌐"),
          react.createElement("span", null, "联网搜索 · 已开启"),
          react.createElement(
            "button",
            {
              type: "button",
              title: "点击取消并关闭联网搜索模式",
              onClick: handleDisableMode,
              disabled: busy,
              style: {
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
              },
            },
            "✕"
          )
        );
      } else {
        triggerElem = react.createElement(
          "button",
          {
            type: "button",
            className: "dsh-web-search-trigger",
            title: "点击配置联网搜索（可开启后续对话自动搜索或单次检索）",
            onClick: function () {
              setPopoverOpen(function (prev) {
                return !prev;
              });
            },
            disabled: busy,
            style: {
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
              color: "var(--dsw-alias-label-secondary, #333333)",
              fontSize: "12px",
              fontWeight: 500,
              lineHeight: "20px",
              cursor: "pointer",
              transition: "all 0.15s ease-in-out",
              userSelect: "none",
              outline: "none",
            },
          },
          react.createElement("span", { style: { fontSize: "13px" } }, "🌐"),
          react.createElement("span", null, "联网搜索")
        );
      }

      var popoverElem = null;
      if (popoverOpen) {
        var actions = [];

        if (draft) {
          actions.push(
            react.createElement(
              "button",
              {
                key: "instant",
                type: "button",
                onClick: handleInstantSearch,
                style: {
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
                },
              },
              "⚡ 立即单次检索当前输入内容"
            )
          );
        }

        actions.push(
          react.createElement(
            "button",
            {
              key: "enable",
              type: "button",
              onClick: handleEnableMode,
              style: {
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
              },
            },
            "✅ 开启后续自动联网搜索"
          )
        );

        actions.push(
          react.createElement(
            "button",
            {
              key: "cancel",
              type: "button",
              onClick: function () {
                setPopoverOpen(false);
                restoreFocus();
              },
              style: {
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
              },
            },
            "取消"
          )
        );

        popoverElem = react.createElement(
          "div",
          {
            className: "dsh-web-search-popover",
            style: {
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
            },
          },
          react.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "6px",
              },
            },
            react.createElement("span", { style: { fontWeight: 600, fontSize: "13px" } }, "🌐 联网搜索模式"),
            react.createElement(
              "button",
              {
                type: "button",
                title: "关闭",
                onClick: function () {
                  setPopoverOpen(false);
                  restoreFocus();
                },
                style: {
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "var(--dsw-alias-label-tertiary, #999999)",
                  padding: "2px",
                  lineHeight: 1,
                },
              },
              "✕"
            )
          ),
          react.createElement(
            "p",
            {
              style: {
                margin: "0 0 12px",
                fontSize: "12px",
                lineHeight: "18px",
                color: "var(--dsw-alias-label-secondary, #666666)",
              },
            },
            "开启后，当前会话的所有后续提问将默认自动调用真实网页检索工具获取实时信息。"
          ),
          react.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              },
            },
            actions
          )
        );
      }

      return react.createElement(
        "div",
        {
          ref: rootRef,
          className: "dsh-web-search-wrapper",
          style: {
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
          },
        },
        triggerElem,
        popoverElem
      );
    }

    function apply(ctx) {
      ctx.inject(["slots", "remote.commands", "sessions"], function (scope) {
        scope.slots.inject("conversation.input.left", function () {
          return scope.slots.register(
            {
              name: "conversation.input.left",
              id: "web-search-button",
              order: 10,
              inject: function (sessionId) {
                return {
                  sessionId: sessionId,
                  onExecuteCommand: function (cmd, sid) {
                    var targetId = sid || sessionId;
                    if (!targetId) {
                      return Promise.reject(new Error("No active session ID available"));
                    }

                    // Direct remote commands channel
                    var remote = (scope && scope.remote) || (ctx && ctx.remote);
                    if (remote && remote.commands && typeof remote.commands.execute === "function") {
                      return remote.commands.execute(targetId, cmd, []).then(function (res) {
                        if (res && !res.ok) {
                          throw new Error(res.error ? res.error.message : "Command failed");
                        }
                        return res;
                      });
                    }

                    // Fallback to session.prompt
                    var sessions = (scope && scope.sessions) || (ctx && ctx.sessions);
                    var binding = sessions && typeof sessions.binding === "function"
                      ? sessions.binding(targetId)
                      : null;
                    var session = binding && binding.session;
                    if (!session) {
                      return Promise.reject(new Error("Session binding not found for ID: " + targetId));
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
                };
              },
            },
            SearchButton
          );
        });
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
