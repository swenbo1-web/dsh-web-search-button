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

      // Read draft from props.input (direct spread from ownerProps) or fallback to props.zone.input
      var inputObj = props.input || (props.zone && props.zone.input);
      var draft = (inputObj && typeof inputObj.draft === "string" ? inputObj.draft : "").trim();
      var sessionObj = props.session || (props.zone && props.zone.session);
      var currentSessionId = (sessionObj && sessionObj.sessionId) || props.sessionId;
      var canRun = typeof props.onSearch === "function";

      var handleClick = function () {
        var activeInput = props.input || (props.zone && props.zone.input);
        var activeDraft = (activeInput && typeof activeInput.draft === "string" ? activeInput.draft : "").trim();

        if (!activeDraft) {
          alert("请先在输入框中输入你想搜索的关键词或问题，然后再点击「联网搜索」！");
          return;
        }
        if (busy) return;

        setBusy(true);
        Promise.resolve(props.onSearch(activeDraft, currentSessionId))
          .catch(function (err) {
            console.error("[dsh-web-search-button] search dispatch failed:", err);
            alert("搜索执行失败：" + (err && err.message ? err.message : String(err)));
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
          title: draft ? "点击联网搜索：“" + draft + "”" : "点击直接调用网络工具检索（需先在输入框输入内容）",
          onClick: handleClick,
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
          },
        },
        react.createElement("span", { style: { fontSize: "13px" } }, "🌐"),
        react.createElement("span", null, busy ? "搜索中..." : "联网搜索")
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
                  onSearch: function (query, sid) {
                    var targetId = sid || sessionId;
                    if (!targetId) {
                      return Promise.reject(new Error("No active session ID available"));
                    }

                    // Direct remote command execution channel
                    var remote = (scope && scope.remote) || (ctx && ctx.remote);
                    if (remote && remote.commands && typeof remote.commands.execute === "function") {
                      return remote.commands.execute(targetId, "/search " + query, []).then(function (res) {
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
