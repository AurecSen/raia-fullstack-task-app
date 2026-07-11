export const MAX_TITLE_LENGTH = 160

const DAY_IN_MS = 24 * 60 * 60 * 1000

export type TaskLike = {
  is_complete: boolean
  due_date: string | null
  created_at?: string
}

export type SortableTask = TaskLike & {
  id: string
}

export type TaskStats = {
  total: number
  completed: number
  active: number
  overdue: number
  dueSoon: number
}

export type DueStatus = 'none' | 'done' | 'overdue' | 'today' | 'upcoming'

export function validateTaskTitle(title: string): string | null {
  const trimmed = title.trim()

  if (!trimmed) {
    return 'Task title is required.'
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return `Task title must be ${MAX_TITLE_LENGTH} characters or fewer.`
  }

  return null
}

export function getTaskStats(tasks: TaskLike[], now = new Date()): TaskStats {
  return tasks.reduce<TaskStats>(
    (stats, task) => {
      const dueStatus = getDueStatus(task, now)

      stats.total += 1
      if (task.is_complete) {
        stats.completed += 1
      } else {
        stats.active += 1
      }

      if (dueStatus === 'overdue') {
        stats.overdue += 1
      }

      if (dueStatus === 'today' || dueStatus === 'upcoming') {
        stats.dueSoon += 1
      }

      return stats
    },
    { total: 0, completed: 0, active: 0, overdue: 0, dueSoon: 0 },
  )
}

export function getDueStatus(task: TaskLike, now = new Date()): DueStatus {
  if (task.is_complete) return 'done'
  if (!task.due_date) return 'none'

  const today = startOfDay(now)
  const dueDate = startOfDay(new Date(`${task.due_date}T00:00:00`))
  const dayDifference = Math.round((dueDate.getTime() - today.getTime()) / DAY_IN_MS)

  if (dayDifference < 0) return 'overdue'
  if (dayDifference === 0) return 'today'
  if (dayDifference <= 3) return 'upcoming'
  return 'none'
}

export function sortTasks<T extends SortableTask>(tasks: T[]): T[] {
  return [...tasks].sort((first, second) => {
    if (first.is_complete !== second.is_complete) {
      return first.is_complete ? 1 : -1
    }

    const dueComparison = compareDueDates(first.due_date, second.due_date)
    if (dueComparison !== 0) {
      return dueComparison
    }

    return parseDate(second.created_at) - parseDate(first.created_at)
  })
}

function compareDueDates(first: string | null, second: string | null) {
  if (first && second) {
    return first.localeCompare(second)
  }

  if (first && !second) return -1
  if (!first && second) return 1
  return 0
}

function parseDate(value: string | undefined) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
