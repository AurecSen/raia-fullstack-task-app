import { describe, expect, it } from 'vitest'
import { getDueStatus, getTaskStats, sortTasks, validateTaskTitle } from './taskUtils'

const now = new Date('2026-07-11T12:00:00Z')

describe('task utilities', () => {
  it('validates required and bounded task titles', () => {
    expect(validateTaskTitle('')).toBe('Task title is required.')
    expect(validateTaskTitle('   ')).toBe('Task title is required.')
    expect(validateTaskTitle('x'.repeat(161))).toBe('Task title must be 160 characters or fewer.')
    expect(validateTaskTitle('Write meaningful tests')).toBeNull()
  })

  it('counts active, completed, overdue, and due-soon tasks', () => {
    const stats = getTaskStats(
      [
        { is_complete: false, due_date: '2026-07-10' },
        { is_complete: false, due_date: '2026-07-11' },
        { is_complete: false, due_date: '2026-07-14' },
        { is_complete: true, due_date: '2026-07-01' },
        { is_complete: false, due_date: null },
      ],
      now,
    )

    expect(stats).toEqual({
      total: 5,
      completed: 1,
      active: 4,
      overdue: 1,
      dueSoon: 2,
    })
  })

  it('classifies due dates without flagging completed work as overdue', () => {
    expect(getDueStatus({ is_complete: false, due_date: '2026-07-10' }, now)).toBe('overdue')
    expect(getDueStatus({ is_complete: false, due_date: '2026-07-11' }, now)).toBe('today')
    expect(getDueStatus({ is_complete: false, due_date: '2026-07-13' }, now)).toBe('upcoming')
    expect(getDueStatus({ is_complete: true, due_date: '2026-07-10' }, now)).toBe('done')
    expect(getDueStatus({ is_complete: false, due_date: null }, now)).toBe('none')
  })

  it('sorts active tasks before completed tasks and prioritizes earlier due dates', () => {
    const sorted = sortTasks([
      { id: 'done', is_complete: true, due_date: '2026-07-01', created_at: '2026-07-01T00:00:00Z' },
      { id: 'no-due', is_complete: false, due_date: null, created_at: '2026-07-12T00:00:00Z' },
      { id: 'early', is_complete: false, due_date: '2026-07-12', created_at: '2026-07-10T00:00:00Z' },
      { id: 'late', is_complete: false, due_date: '2026-07-20', created_at: '2026-07-11T00:00:00Z' },
    ])

    expect(sorted.map((task) => task.id)).toEqual(['early', 'late', 'no-due', 'done'])
  })
})
