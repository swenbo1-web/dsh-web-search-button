window.__ModuleLoader__.load({
  id: "dsh-web-search-button",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var react = require("react");
    var inject = ["slots", "remote.commands", "sessions"];

    function SearchButton(props) {
      var sessionObj = props.session || (props.zone && props.zone.session);
      var currentSessionId = (sessionObj && sessionObj.sessionId) || props.sessionId;

      var state = react.useState(function () {
        if (!currentSessionId) return false;
        try {
          return localStorage.getItem("dsh.webSearchMode." + currentSessionId) === "true";
        } catch (e) {
          return false;
        }
      });
      var active = state[0];
      var setActive = state[1];

      react.useEffect(function () {
        if (!currentSessionId) return;
        try {
          var stored = localStorage.getItem("dsh.webSearchMode." + currentSessionId) === "true";
          setActive(stored);
        } catch (e) {}
      }, [currentSessionId]);

      var restoreFocus = function () {
        setTimeout(function () {
          var editor = document.querySelector('[contenteditable="true"]');
          if (editor) {
            editor.focus();
          }
        }, 20);
      };

      // Pure click toggle: Click -> Lit up (常亮), Click again -> Dimmed (变暗)
      var handleClick = function (e) {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();

        var next = !active;
        setActive(next);

        if (currentSessionId) {
          try {
            localStorage.setItem("dsh.webSearchMode." + currentSessionId, next ? "true" : "false");
          } catch (err) {}

          if (props.onExecuteCommand) {
            Promise.resolve(
              props.onExecuteCommand(next ? "/search on" : "/search off", currentSessionId)
            ).catch(function (err) {
              console.error("[dsh-web-search-button] toggle command failed:", err);
            });
          }
        }

        restoreFocus();
      };

      return react.createElement(
        "button",
        {
          type: "button",
          className: "dsh-web-search-toggle " + (active ? "active" : ""),
          title: active
            ? "联网搜索模式已开启（常亮）：点击关闭（变暗）"
            : "联网搜索模式已关闭（变暗）：点击开启（常亮）",
          onClick: handleClick,
          style: {
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
          },
        },
        react.createElement("span", { style: { fontSize: "13px", opacity: active ? 1 : 0.85 } }, "🌐"),
        react.createElement("span", null, "联网搜索")
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
                    if (!targetId) return Promise.resolve();

                    // Direct remote commands channel
                    var remote = (scope && scope.remote) || (ctx && ctx.remote);
                    if (remote && remote.commands && typeof remote.commands.execute === "function") {
                      return remote.commands.execute(targetId, cmd, []);
                    }

                    // Fallback to session.prompt
                    var sessions = (scope && scope.sessions) || (ctx && ctx.sessions);
                    var binding = sessions && typeof sessions.binding === "function"
                      ? sessions.binding(targetId)
                      : null;
                    var session = binding && binding.session;
                    if (session) {
                      return session.prompt([{ type: "text", text: cmd }], "queue");
                    }

                    return Promise.resolve();
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
