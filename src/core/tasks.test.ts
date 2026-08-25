import { describe, expect, it } from 'vitest'
import { applyUpdateTask } from './use-cases/task-update.ts'
import { parseLedger } from './store.ts'
import { createTask, isValidBranchName, slugifyBranch } from './tasks.ts'

const baseInput = {
  title: '  Pick a model  ',
  description: '',
  prompt: 'run it',
}

describe('task model selection', () => {
  it('normalizes and persists the provider/model/effort pin', () => {
    const task = createTask({
      ...baseInput,
      modelSelection: {
        provider: ' openai ',
        model: ' gpt-5 ',
        reasoningEffort: ' high ',
      },
    }, 10, 'task-1')

    expect(task.modelSelection).toEqual({
      provider: 'openai',
      model: 'gpt-5',
      reasoningEffort: 'high',
    })
    expect(parseLedger(JSON.stringify([task]))[0]?.modelSelection).toEqual(task.modelSelection)
  })

  it('repairs a malformed persisted pin without dropping the task row', () => {
    const task = createTask(baseInput, 10, 'task-1')
    const parsed = parseLedger(JSON.stringify([{ ...task, modelSelection: { provider: 'openai' } }]))
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.modelSelection).toBeUndefined()
  })

  it('clears a pin when the detail editor selects the default', () => {
    const task = createTask({
      ...baseInput,
      modelSelection: { provider: 'openai', model: 'gpt-5', reasoningEffort: 'high' },
    }, 10, 'task-1')
    const updated = applyUpdateTask([task], task.id, { modelSelection: undefined }, 20)[0]
    expect(updated?.modelSelection).toBeUndefined()
  })
})

describe('executor and worktree pins', () => {
  it('keeps the codex executor and drops the dsh default', () => {
    const codexTask = createTask({ ...baseInput, executor: 'codex' }, 10, 'task-1')
    expect(codexTask.executor).toBe('codex')
    const dshTask = createTask({ ...baseInput, executor: 'dsh' }, 10, 'task-2')
    expect(dshTask.executor).toBeUndefined()
  })

  it('normalizes codex model/effort pins and the worktree spec', () => {
    const task = createTask({
      ...baseInput,
      executor: 'codex',
      codexModel: ' gpt-5.6-sol ',
      codexEffort: '',
      worktree: { branch: ' feature/x ' },
    }, 10, 'task-1')
    expect(task.codexModel).toBe('gpt-5.6-sol')
    expect(task.codexEffort).toBeUndefined()
    expect(task.worktree).toEqual({ branch: 'feature/x' })

    const parsed = parseLedger(JSON.stringify([
      { ...task, worktree: { ...task.worktree, path: '/repo/.dsh-worktrees/feature-x', workspaceId: 'ws-9' } },
    ]))
    expect(parsed[0]?.worktree).toEqual({
      branch: 'feature/x',
      path: '/repo/.dsh-worktrees/feature-x',
      workspaceId: 'ws-9',
    })
  })

  it('drops a worktree spec without a usable branch (create + update + ledger)', () => {
    const created = createTask({ ...baseInput, worktree: { branch: '   ' } }, 10, 'task-1')
    expect(created.worktree).toBeUndefined()
    const patched = applyUpdateTask([{ ...created }], 'task-1', { worktree: undefined }, 20)[0]
    expect(patched?.worktree).toBeUndefined()
    const task = createTask(baseInput, 10, 'task-2')
    const parsed = parseLedger(JSON.stringify([{ ...task, worktree: { nope: true } }]))
    expect(parsed[0]?.worktree).toBeUndefined()
  })

  it('updates the worktree spec through the patch use case', () => {
    const task = createTask(baseInput, 10, 'task-1')
    const updated = applyUpdateTask([task], task.id, { worktree: { branch: 'wt/a' } }, 20)[0]
    expect(updated?.worktree).toEqual({ branch: 'wt/a' })
  })

  it('derives safe branch slugs and rejects bad names', () => {
    expect(slugifyBranch('Fix: 発売!! processing…', 0)).toMatch(/^fix-processing-\d{8}$/)
    expect(slugifyBranch('', 0)).toMatch(/^task-\d{8}$/)
    expect(isValidBranchName('feature/add-widget')).toBe(true)
    expect(isValidBranchName('-leading')).toBe(false)
    expect(isValidBranchName('a..b')).toBe(false)
    expect(isValidBranchName('with space')).toBe(false)
    expect(isValidBranchName('ends.lock')).toBe(false)
  })
})
