/**
 * Executor editor fields shared by the new-task modal and the task detail
 * view: the Codex model picker (catalog + custom slug) and the Codex
 * reasoning-effort picker. Purely presentational over the controller's
 * codex option snapshot.
 */
import type { CodexOptionsSnapshot } from '../../core/controller.ts';
/** Sentinel select value for the "custom slug" choice. */
export declare const CODEX_MODEL_CUSTOM = "__custom__";
/** Props of the codex model picker. */
export interface CodexModelFieldProps {
    options: CodexOptionsSnapshot;
    value: string | undefined;
    onChange: (slug: string | undefined) => void;
}
/**
 * The Codex model picker. When the host catalog is readable it lists real
 * models; a custom entry always remains available for slugs the cache does
 * not know about.
 */
export declare function CodexModelField({ options, value, onChange }: CodexModelFieldProps): import("react").JSX.Element;
/** Props of the codex effort picker. */
export interface CodexEffortFieldProps {
    options: CodexOptionsSnapshot;
    /** The currently pinned (or custom) model slug; picks the efforts to offer. */
    modelSlug: string | undefined;
    value: string | undefined;
    onChange: (effort: string | undefined) => void;
}
/** The Codex reasoning-effort picker over the selected model's levels. */
export declare function CodexEffortField({ options, modelSlug, value, onChange }: CodexEffortFieldProps): import("react").JSX.Element;
//# sourceMappingURL=ExecutorFields.d.ts.map