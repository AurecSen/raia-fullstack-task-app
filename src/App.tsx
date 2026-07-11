import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  MAX_TITLE_LENGTH,
  getDueStatus,
  getTaskStats,
  sortTasks,
  validateTaskTitle,
} from './lib/taskUtils'
import type { Tables, TablesInsert, TablesUpdate } from './types/database.types'

type Task = Tables<'tasks'>
type AuthMode = 'sign-in' | 'sign-up'

type TaskDraft = {
  title: string
  notes: string
  due_date: string
}

const emptyDraft: TaskDraft = {
  title: '',
  notes: '',
  due_date: '',
}

function App() {
  const [authReady, setAuthReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [savingTask, setSavingTask] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyDraft)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<TaskDraft>(emptyDraft)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const stats = useMemo(() => getTaskStats(tasks), [tasks])
  const orderedTasks = useMemo(() => sortTasks(tasks), [tasks])

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }

    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data.session)
        }
      })
      .catch(() => {
        if (mounted) {
          setErrorMessage('Unable to read your saved session. Please try again.')
        }
      })
      .finally(() => {
        if (mounted) {
          setAuthReady(true)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setMessage('')
      setErrorMessage('')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session) {
      setTasks([])
      return
    }

    void fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  async function fetchTasks() {
    if (!supabase || !session) return

    setTasksLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('is_complete', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage(error.message)
    } else {
      setTasks(data ?? [])
    }

    setTasksLoading(false)
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setMessage('')
    setErrorMessage('')

    if (!email.trim()) {
      setErrorMessage('Enter your email address.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Use a password with at least 6 characters.')
      return
    }

    setAuthLoading(true)

    const response =
      authMode === 'sign-up'
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password })

    if (response.error) {
      setErrorMessage(response.error.message)
    } else if (authMode === 'sign-up' && !response.data.session) {
      setMessage('Account created. Check your email to confirm your address, then sign in.')
    } else {
      setMessage(authMode === 'sign-up' ? 'Account created. Welcome!' : 'Signed in successfully.')
    }

    setAuthLoading(false)
  }

  async function signOut() {
    if (!supabase) return

    const { error } = await supabase.auth.signOut()
    if (error) {
      setErrorMessage(error.message)
      return
    }

    setTasks([])
    setTaskDraft(emptyDraft)
    setEditingTaskId(null)
    setMessage('Signed out successfully.')
  }

  function updateDraft<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setTaskDraft((current) => ({ ...current, [key]: value }))
  }

  function updateEditDraft<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setEditDraft((current) => ({ ...current, [key]: value }))
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !session) return

    const validationError = validateTaskTitle(taskDraft.title)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setSavingTask(true)
    setErrorMessage('')

    const payload: TablesInsert<'tasks'> = {
      title: taskDraft.title.trim(),
      notes: taskDraft.notes.trim(),
      due_date: taskDraft.due_date || null,
      user_id: session.user.id,
    }

    const { data, error } = await supabase.from('tasks').insert(payload).select('*').single()

    if (error) {
      setErrorMessage(error.message)
    } else {
      setTasks((current) => sortTasks([data, ...current]))
      setTaskDraft(emptyDraft)
      setMessage('Task added.')
    }

    setSavingTask(false)
  }

  function startEditing(task: Task) {
    setEditingTaskId(task.id)
    setEditDraft({
      title: task.title,
      notes: task.notes,
      due_date: task.due_date ?? '',
    })
  }

  function cancelEditing() {
    setEditingTaskId(null)
    setEditDraft(emptyDraft)
  }

  async function updateTask(task: Task) {
    if (!supabase || !session) return

    const validationError = validateTaskTitle(editDraft.title)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setSavingTask(true)
    setErrorMessage('')

    const updates: TablesUpdate<'tasks'> = {
      title: editDraft.title.trim(),
      notes: editDraft.notes.trim(),
      due_date: editDraft.due_date || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id)
      .eq('user_id', session.user.id)
      .select('*')
      .single()

    if (error) {
      setErrorMessage(error.message)
    } else {
      setTasks((current) => sortTasks(current.map((item) => (item.id === data.id ? data : item))))
      setEditingTaskId(null)
      setEditDraft(emptyDraft)
      setMessage('Task updated.')
    }

    setSavingTask(false)
  }

  async function toggleComplete(task: Task) {
    if (!supabase || !session) return

    const { data, error } = await supabase
      .from('tasks')
      .update({ is_complete: !task.is_complete, updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .eq('user_id', session.user.id)
      .select('*')
      .single()

    if (error) {
      setErrorMessage(error.message)
    } else {
      setTasks((current) => sortTasks(current.map((item) => (item.id === data.id ? data : item))))
    }
  }

  async function deleteTask(task: Task) {
    if (!supabase || !session) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)
      .eq('user_id', session.user.id)

    if (error) {
      setErrorMessage(error.message)
    } else {
      setTasks((current) => current.filter((item) => item.id !== task.id))
      setMessage('Task deleted.')
    }
  }

  if (!authReady) {
    return (
      <main className="app-shell">
        <div className="app-container loader">Loading secure workspace…</div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <div className="app-container">
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-card">
            <span className="kicker">Secure full-stack test</span>
            <h1 id="page-title">Organize the work that matters.</h1>
            <p>
              A responsive task manager with Supabase authentication and row-level protected
              data. Every task is scoped to the signed-in user by database policy.
            </p>
          </div>

          {!session ? (
            <AuthCard
              authMode={authMode}
              setAuthMode={setAuthMode}
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
              authLoading={authLoading}
              handleAuth={handleAuth}
            />
          ) : (
            <div className="auth-card">
              <div className="auth-header">
                <div>
                  <h2>Welcome back</h2>
                  <p>Your session is active and ready for task updates.</p>
                </div>
              </div>
              <div className="user-strip">
                <div>
                  <span>Signed in as</span>
                  <strong>{session.user.email}</strong>
                </div>
                <button className="secondary-button" type="button" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </section>

        {!isSupabaseConfigured && (
          <div className="config-warning" role="alert">
            Supabase is not configured for this environment. Add `VITE_SUPABASE_URL` and
            `VITE_SUPABASE_PUBLISHABLE_KEY` to enable authentication and task storage.
          </div>
        )}

        {(message || errorMessage) && (
          <div className={`status-message ${errorMessage ? 'error' : ''}`} role="status">
            {errorMessage || message}
          </div>
        )}

        {session && (
          <section className="dashboard-grid" aria-label="Task dashboard">
            <aside className="panel">
              <h2>Add a task</h2>
              <p className="panel-subtitle">
                Capture the next step, add context, and optionally set a due date.
              </p>

              <form className="form-grid" onSubmit={createTask}>
                <div className="field">
                  <label htmlFor="task-title">Title</label>
                  <input
                    id="task-title"
                    maxLength={MAX_TITLE_LENGTH}
                    placeholder="Ship the full-stack test app"
                    value={taskDraft.title}
                    onChange={(event) => updateDraft('title', event.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="task-notes">Notes</label>
                  <textarea
                    id="task-notes"
                    placeholder="Add links, acceptance criteria, or a short plan…"
                    value={taskDraft.notes}
                    onChange={(event) => updateDraft('notes', event.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="task-due-date">Due date</label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={taskDraft.due_date}
                    onChange={(event) => updateDraft('due_date', event.target.value)}
                  />
                </div>

                <button className="primary-button" type="submit" disabled={savingTask}>
                  {savingTask ? 'Saving…' : 'Add task'}
                </button>
              </form>

              <div className="stats-grid" aria-label="Task summary">
                <StatCard label="Total" value={stats.total} />
                <StatCard label="Active" value={stats.active} />
                <StatCard label="Done" value={stats.completed} />
                <StatCard label="Due soon" value={stats.dueSoon} />
              </div>
            </aside>

            <section className="panel">
              <div className="task-list-header">
                <div>
                  <h2>Your tasks</h2>
                  <p className="panel-subtitle">
                    {stats.overdue > 0
                      ? `${stats.overdue} overdue task${stats.overdue === 1 ? '' : 's'} need attention.`
                      : 'Everything is protected by Supabase RLS and synced to Postgres.'}
                  </p>
                </div>
                <button className="secondary-button" type="button" onClick={fetchTasks}>
                  {tasksLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {tasksLoading && tasks.length === 0 ? (
                <div className="empty-state">Loading your tasks…</div>
              ) : orderedTasks.length === 0 ? (
                <div className="empty-state">
                  <strong>No tasks yet.</strong>
                  <p>Add your first task to test authenticated create/read flows.</p>
                </div>
              ) : (
                <div className="task-list">
                  {orderedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isEditing={editingTaskId === task.id}
                      editDraft={editDraft}
                      savingTask={savingTask}
                      onToggle={() => void toggleComplete(task)}
                      onDelete={() => void deleteTask(task)}
                      onEdit={() => startEditing(task)}
                      onCancel={cancelEditing}
                      onSave={() => void updateTask(task)}
                      onEditDraftChange={updateEditDraft}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>
        )}
      </div>
    </main>
  )
}

function AuthCard({
  authMode,
  setAuthMode,
  email,
  password,
  setEmail,
  setPassword,
  authLoading,
  handleAuth,
}: {
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  email: string
  password: string
  setEmail: (value: string) => void
  setPassword: (value: string) => void
  authLoading: boolean
  handleAuth: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="auth-card">
      <div className="auth-header">
        <div>
          <h2>{authMode === 'sign-in' ? 'Sign in' : 'Create account'}</h2>
          <p>Use email and password auth to access your private task list.</p>
        </div>
        <div className="mode-switch" aria-label="Authentication mode">
          <button
            className={authMode === 'sign-in' ? 'active' : ''}
            type="button"
            onClick={() => setAuthMode('sign-in')}
          >
            Sign in
          </button>
          <button
            className={authMode === 'sign-up' ? 'active' : ''}
            type="button"
            onClick={() => setAuthMode('sign-up')}
          >
            Sign up
          </button>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleAuth}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            autoComplete={authMode === 'sign-up' ? 'new-password' : 'current-password'}
            placeholder="At least 6 characters"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button className="primary-button" type="submit" disabled={authLoading || !isSupabaseConfigured}>
          {authLoading ? 'Working…' : authMode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function TaskCard({
  task,
  isEditing,
  editDraft,
  savingTask,
  onToggle,
  onDelete,
  onEdit,
  onCancel,
  onSave,
  onEditDraftChange,
}: {
  task: Task
  isEditing: boolean
  editDraft: TaskDraft
  savingTask: boolean
  onToggle: () => void
  onDelete: () => void
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onEditDraftChange: <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => void
}) {
  const dueStatus = getDueStatus(task)

  return (
    <article className={`task-card ${task.is_complete ? 'complete' : ''}`}>
      <button
        className={`checkbox-button ${task.is_complete ? 'checked' : ''}`}
        type="button"
        aria-label={task.is_complete ? 'Mark task incomplete' : 'Mark task complete'}
        onClick={onToggle}
      >
        {task.is_complete ? '✓' : ''}
      </button>

      <div className="task-body">
        <div className="task-topline">
          <div>
            <h3 className="task-title">{task.title}</h3>
            {task.notes && <p className="task-notes">{task.notes}</p>}
          </div>
          <div className="action-row">
            <button className="secondary-button" type="button" onClick={onEdit}>
              Edit
            </button>
            <button className="danger-button" type="button" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>

        <div className="task-meta">
          <span className="badge">{task.is_complete ? 'Complete' : 'Active'}</span>
          {task.due_date && (
            <span className={`badge ${dueStatus}`}>Due {formatDueDate(task.due_date)}</span>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="inline-editor">
          <div className="form-grid">
            <div className="field">
              <label htmlFor={`edit-title-${task.id}`}>Title</label>
              <input
                id={`edit-title-${task.id}`}
                maxLength={MAX_TITLE_LENGTH}
                value={editDraft.title}
                onChange={(event) => onEditDraftChange('title', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`edit-notes-${task.id}`}>Notes</label>
              <textarea
                id={`edit-notes-${task.id}`}
                value={editDraft.notes}
                onChange={(event) => onEditDraftChange('notes', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`edit-date-${task.id}`}>Due date</label>
              <input
                id={`edit-date-${task.id}`}
                type="date"
                value={editDraft.due_date}
                onChange={(event) => onEditDraftChange('due_date', event.target.value)}
              />
            </div>
            <div className="action-row">
              <button className="primary-button" type="button" onClick={onSave} disabled={savingTask}>
                Save changes
              </button>
              <button className="secondary-button" type="button" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

function formatDueDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export default App
