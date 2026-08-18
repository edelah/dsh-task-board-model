import { describe, expect, it } from 'vitest'
import { applyUpdateTask } from './use-cases/task-update.ts'
import { parseLedger } from './store.ts'
import { createTask } from './tasks.ts'

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
