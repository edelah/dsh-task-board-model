/**
 * Host loader entry for the task-board plugin.
 *
 * Everything the board does is browser work (DOM, localStorage, driving the
 * client runtime's session services over the wire), so the host half's main
 * behavior is a system-prompt section announcing the plugin to every agent.
 * The section registers while this plugin is in the host composition (mount /
 * DSH restart) and disappears when the plugin leaves it (unmount / restart),
 * so agents always know the board exists and how to cooperate with it. The
 * announcement can be turned off through the web settings plugin-configuration
 * surface (`announceToAgent`); the section then disappears live.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from 'schemastery';
export declare const inject: string[];
/** Model-facing announcement: plugin presence, capabilities, and limits. */
export declare const TASK_BOARD_GUIDANCE = "\u672C\u673A\u5DF2\u5B89\u88C5 dsh-task-board-model \u63D2\u4EF6\uFF08DSH Web GUI \u7684\u4EFB\u52A1\u770B\u677F\uFF09\uFF1A\u4FA7\u8FB9\u680F\u300C\u4EFB\u52A1\u770B\u677F\u300D\u5165\u53E3\u3002\u80FD\u529B\uFF1A\u591A\u5217\u770B\u677F\u7BA1\u7406\u4EFB\u52A1\uFF1B\u4EFB\u52A1\u53EF\u771F\u5B9E\u6267\u884C\uFF1B\u4EFB\u52A1\u53EF\u9489\u4F4F\u6267\u884C\u76EE\u6807\u2014\u2014\u5DE5\u4F5C\u533A / \u6A21\u5F0F\uFF08agent \u9884\u8BBE\uFF09/ \u6743\u9650\uFF08read-only / workspace-write / danger-full-access\uFF09/ \u6A21\u578B / \u63A8\u7406\u529B\u5EA6\uFF0C\u7F3A\u7701\u7528\u8FD0\u884C\u65F6\u9ED8\u8BA4\uFF1B\u6267\u884C\u8005\u53EF\u9009 DSH \u4F1A\u8BDD\u6216 OpenAI Codex\uFF08\u7ECF\u5BBF\u4E3B\u673A codex app-server \u8FD0\u884C\uFF1A\u53EF\u9009\u6A21\u578B\u4E0E\u63A8\u7406\u529B\u5EA6\u3001\u5B9E\u65F6\u6D3B\u52A8\u6D41\u3001\u8FDB\u884C\u4E2D\u53EF steer \u6CE8\u5165\u8F93\u5165\u3001\u7ED3\u675F\u540E\u53EF\u5728\u540C\u4E00\u7EBF\u7A0B\u7EE7\u7EED\u8FFD\u95EE\u3001\u91CD\u542F\u540E\u51ED\u7ED1\u5B9A\u6062\u590D\u7EBF\u7A0B\uFF09\uFF1B\u53EF\u4E3A\u4EFB\u52A1\u521B\u5EFA git worktree \u6267\u884C\uFF08\u81EA\u52A8\u6CE8\u518C\u4E3A\u5DE5\u4F5C\u533A\uFF0C\u51FA\u73B0\u5728\u4FA7\u8FB9\u680F\uFF09\uFF1B\u4EFB\u52A1\u652F\u6301 5 \u6BB5 cron \u5B9A\u65F6\u6267\u884C\uFF08\u5982 0 23 * * *\uFF09\uFF1B\u6570\u636E\u5B58\u6D4F\u89C8\u5668 localStorage\uFF08\u952E dsh.taskBoard.v1\uFF09\u3002\u9650\u5236\uFF1A\u5B9A\u65F6\u8C03\u5EA6\u5728\u6D4F\u89C8\u5668\u7AEF\uFF0C\u9700 GUI \u6807\u7B7E\u9875\u6253\u5F00\uFF0C\u9519\u8FC7\u5373\u8DF3\u8FC7\uFF1BCodex \u5B50\u4EE3\u7406\u5BA1\u6279\u8BF7\u6C42\u4E00\u5F8B\u62D2\u7EDD\uFF08fail-closed\uFF09\uFF0C\u6C99\u7BB1\u968F\u6743\u9650\u9884\u8BBE\u56FA\u5B9A\uFF1B\u6267\u884C\u6D88\u8017 API \u989D\u5EA6\u3002\u7528\u6237\u63D0\u5230\u300C\u4EFB\u52A1\u770B\u677F / \u770B\u677F / \u5B9A\u65F6\u4EFB\u52A1\u300D\u65F6\u5373\u6307\u672C\u63D2\u4EF6\uFF0C\u8BF7\u636E\u6B64\u534F\u4F5C\u3002";
/**
 * Settings namespace of the board's announcement capability — the section the
 * web settings surface edits. Spelled here rather than imported: the browser
 * half spells the same value and must not depend on a Host package.
 */
export declare const TASK_BOARD_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
    /**
     * When true (default), a system-prompt section announces the board to every
     * agent. Set false to keep the board silent in prompts; agents then learn
     * about it only when the user mentions it.
     */
    announceToAgent?: boolean;
    /** Master switch for the plugin (browser half + host announcement). */
    enabled?: boolean;
}
export declare const Config: z<Config>;
/**
 * Register the board's announcement section, gated on the composition entry's
 * `announceToAgent` (and the live settings value once the web settings
 * surface is served). The section is re-registered whenever the source
 * changes, so a settings edit takes effect without a restart.
 * @param ctx - the plugin context (systemPrompt injected).
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export declare const apply: typeof applyImpl;
declare function applyImpl(ctx: Context, config?: Config): void;
export {};
//# sourceMappingURL=index.d.ts.map