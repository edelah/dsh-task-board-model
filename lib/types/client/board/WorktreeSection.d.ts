import type { BoardController } from '../../core/controller.ts';
import { type TaskRecord } from '../../core/tasks.ts';
/** Compact worktree opt-in used by the new-task modal. */
export declare function WorktreeCreateFields({ enabled, branch, onEnabledChange, onBranchChange, invalid, }: {
    enabled: boolean;
    branch: string;
    onEnabledChange: (next: boolean) => void;
    onBranchChange: (next: string) => void;
    invalid: boolean;
}): import("react").JSX.Element;
/** The detail view's worktree section: state + prepare / open / remove. */
export declare function WorktreeDetailSection({ controller, task }: {
    controller: BoardController;
    task: TaskRecord;
}): import("react").JSX.Element;
//# sourceMappingURL=WorktreeSection.d.ts.map