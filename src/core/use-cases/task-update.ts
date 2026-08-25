/**
 * Update-task use case: apply an editable-field patch (title/description/
 * prompt, the execution targets workspaceId/mode/permission/modelSelection,
 * and the executor pins executor/codexModel/codexEffort/worktree) with a
 * fresh updatedAt. Pure ledger transition (no persistence or notify — the
 * controller orchestrates those).
 *
 * An explicit `undefined` in the patch clears the field (the task falls
 * back to the runtime default); an unknown permission string or executor id
 * is ignored so stale UI can never persist a value the execution service
 * rejects.
 */
import {
  isTaskExecutor, isTaskPermission, normalizeModelSelection, normalizeTargetId,
  normalizeWorktree, type TaskRecord, type TaskPermission,
} from '../tasks.ts'

/** Editable fields on a task (the update patch surface). */
export type TaskUpdatePatch = Partial<Pick<TaskRecord,
  'title' | 'description' | 'prompt' | 'workspaceId' | 'mode' | 'permission' | 'modelSelection'
  | 'executor' | 'codexModel' | 'codexEffort' | 'worktree'
>>

/** Keep an unknown permission string from entering the ledger. */
function normalizePermission(
  current: TaskPermission | undefined,
  value: TaskPermission | undefined,
): TaskPermission | undefined {
  if (value === undefined) return undefined
  return isTaskPermission(value) ? value : current
}

/**
 * Keep an unknown executor id from entering the ledger. Selecting 'dsh'
 * clears the pin (dsh is the absent-field default).
 */
function normalizeExecutor(
  current: TaskRecord['executor'],
  value: TaskRecord['executor'],
): TaskRecord['executor'] {
  if (value === undefined) return undefined
  if (!isTaskExecutor(value)) return current
  return value === 'dsh' ? undefined : value
}

/**
 * Apply an update across the ledger. Tasks that do not match the id are left
 * untouched; the matched task receives the patch plus a fresh updatedAt.
 * @param tasks - current ledger.
 * @param id - the task to update.
 * @param patch - editable-field changes.
 * @param now - clock instant (ms epoch).
 */
export function applyUpdateTask(
  tasks: readonly TaskRecord[],
  id: string,
  patch: TaskUpdatePatch,
  now: number,
): readonly TaskRecord[] {
  return tasks.map(task => {
    if (task.id !== id) return task
    const workspaceId = 'workspaceId' in patch ? normalizeTargetId(patch.workspaceId) : undefined
    const mode = 'mode' in patch ? normalizeTargetId(patch.mode) : undefined
    const permission = 'permission' in patch ? normalizePermission(task.permission, patch.permission) : undefined
    const modelSelection = 'modelSelection' in patch ? normalizeModelSelection(patch.modelSelection) : undefined
    const executor = 'executor' in patch ? normalizeExecutor(task.executor, patch.executor) : undefined
    const codexModel = 'codexModel' in patch ? normalizeTargetId(patch.codexModel) : undefined
    const codexEffort = 'codexEffort' in patch ? normalizeTargetId(patch.codexEffort) : undefined
    const worktree = 'worktree' in patch ? normalizeWorktree(patch.worktree) : undefined
    const next: TaskRecord = { ...task, ...patch, updatedAt: now }
    if (workspaceId !== undefined || 'workspaceId' in patch) next.workspaceId = workspaceId
    if (mode !== undefined || 'mode' in patch) next.mode = mode
    if (permission !== undefined || 'permission' in patch) next.permission = permission
    if (modelSelection !== undefined || 'modelSelection' in patch) next.modelSelection = modelSelection
    if (executor !== undefined || 'executor' in patch) next.executor = executor
    if (codexModel !== undefined || 'codexModel' in patch) next.codexModel = codexModel
    if (codexEffort !== undefined || 'codexEffort' in patch) next.codexEffort = codexEffort
    if ('worktree' in patch) next.worktree = worktree
    return next
  })
}
