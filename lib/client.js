window.__ModuleLoader__.load({
  id: "dsh-web-search-button",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var react = require("react");
    var inject = ["slots", "remote.commands", "sessions"];

    function SearchButton(props) {
      var state = react.useState(false);
      var busy = state[0];
      var setBusy = state[1];

      var zone = props.zone;
      var draft = (zone && zone.input && typeof zone.input.draft === "string" ? zone.input.draft : "").trim();
      var currentSessionId = (zone && zone.session && zone.session.sessionId) || props.sessionId;
      var canRun = typeof props.onSearch === "function";
      var disabled = busy || !draft || !canRun;

      var handleClick = function () {
        if (disabled || !canRun) return;
        setBusy(true);
        Promise.resolve(props.onSearch(draft, currentSessionId))
          .catch(function (err) {
            console.error("[dsh-web-search-button] search dispatch failed:", err);
          })
          .finally(function () {
            setBusy(false);
          });
      };

      return react.createElement(
        "button",
        {
          type: "button",
          className: "dsh-web-search-btn",
          title: draft ? "联网搜索：“" + draft + "”" : "在输入框输入内容后点击联网搜索",
          onClick: handleClick,
          disabled: disabled,
          style: {
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
          },
        },
        react.createElement("span", { style: { fontSize: "13px" } }, "🌐"),
        react.createElement("span", null, busy ? "搜索中..." : "联网搜索")
      );
    }

    function apply(ctx) {
      // Use Cordis scoped injection: registers slot only when dependencies are ready
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
                  onSearch: function (query, sid) {
                    var targetId = sid || sessionId;
                    if (!targetId) {
                      return Promise.reject(new Error("No active session ID available"));
                    }

                    // Direct remote command execution channel
                    if (scope.remote && scope.remote.commands && typeof scope.remote.commands.execute === "function") {
                      return scope.remote.commands.execute(targetId, "/search " + query, []).then(function (res) {
                        if (res && !res.ok) {
                          throw new Error(res.error ? res.error.message : "Command failed");
                        }
                        return res;
                      });
                    }

                    // Fallback to session.prompt
                    var binding = scope.sessions && typeof scope.sessions.binding === "function"
                      ? scope.sessions.binding(targetId)
                      : null;
                    var session = binding && binding.session;
                    if (!session) {
                      return Promise.reject(new Error("Session binding not found for ID: " + targetId));
                    }
                    return session.prompt(
                      [
                        {
                          type: "text",
                          text: "/search " + query,
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
