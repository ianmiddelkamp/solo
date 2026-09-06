import { useEffect, useState } from 'react';
import { getProjects } from '../../api/projects';
import { useTimer } from '../../context/TimerContext';
import { formatElapsed } from '../../utils/dates';
import TaskBoard from '../../components/TaskBoard';
import HelpButton from '../../components/HelpButton';
import { timerPageHelp } from '../../content/helpCopy';
import { confirm, listSelection } from '../../services/dialog';
import type { Project } from '../../types';

interface TaskPatch {
  id: number;
  patch: { status: string };
}

export default function TimerPage() {
  const { session, elapsed, projectId, taskId, description, loading, setProjectId, setTaskId, changeDescription, replaceTask, start, stop, cancel } = useTimer();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskUpdate, setTaskUpdate] = useState<TaskPatch | TaskPatch[] | null>(null);

  useEffect(() => {
    getProjects().then((data) => { if (data) setProjects(data); }).catch((e) => setError(e.message));
  }, []);

  async function handleStart() {
    if (!projectId) return;
    try {
      await start(Number(projectId), taskId);
      if (taskId) setTaskUpdate({ id: taskId, patch: { status: 'in_progress' } });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleStop() {
    try {
      const linkedTaskId = taskId;
      await stop(Number(projectId), description);
      setStopping(false);
      if (linkedTaskId && await confirm('Mark the linked task as done?', { title: 'Task complete?', confirmLabel: 'Mark done', danger: false })) {
        setTaskUpdate({ id: linkedTaskId, patch: { status: 'done' } });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCancel() {
    if (!await confirm('Discard this session without saving a time entry?', { title: 'Discard session', confirmLabel: 'Discard' })) return;
    try {
      await cancel();
      setStopping(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleTaskSelect(id: number | null) {
    if (id === null) return;
    if (session && taskId) {
      const options = [
        { label: 'Keep current task', value: 'KEEP' },
        { label: 'Replace current task', value: 'REPLACE' },
        { label: 'Start new session', value: 'NEW' },
      ];
      const response = await listSelection('Start New Session?', 'Please Confirm', options);
      if (response === 'KEEP') {
        return;
      } else if (response === 'REPLACE') {
        await replaceTask(id);
        setTaskUpdate([
          { id: taskId, patch: { status: 'todo' } },
          { id, patch: { status: 'in_progress' } },
        ]);
      } else if (response === 'NEW') {
        setTaskUpdate({ id: taskId, patch: { status: 'done' } });
        await stop(Number(projectId), description);
        await start(Number(projectId), id);
        setTaskUpdate({ id, patch: { status: 'in_progress' } });
      }
    } else {
      if (session) {
        await replaceTask(id);
        setTaskUpdate({ id, patch: { status: 'in_progress' } });
      } else {
        const confirmed = await confirm('Start timer with this task?', { title: 'Start timer?', confirmLabel: 'Start' });
        if (confirmed) {
          await start(Number(projectId), id);
          setTaskUpdate({ id, patch: { status: 'in_progress' } });
        } else {
          setTaskId(id);
        }
      }
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setProjectId(e.target.value);
    setTaskId(null);
  }

  return (
    <div>
      {/* Sticky, full-width timer bar — pinned to the top of the scrollable content area in
          every viewport, not just mobile. Sticky (not fixed) so it stays scoped to <main>'s own
          scroll box instead of the whole browser viewport — a fixed position here would overlay
          the app's own mobile nav bar, which sits above <main> in the layout, not inside it. */}
      <div className="sticky top-0 z-40 w-full bg-white shadow-sm p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
          )}

          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <p className="text-4xl sm:text-6xl font-mono font-semibold text-gray-800 tracking-widest">
                  {formatElapsed(elapsed)}
                </p>
                <HelpButton title={timerPageHelp.title}>{timerPageHelp.content}</HelpButton>
              </div>
              {session && (
                <p className="mt-2 text-sm text-gray-500">
                  {session.project?.name}{session.project?.client ? ` — ${session.project.client.name}` : ''}
                  {session.task && <span className="ml-2 text-indigo-500">· {session.task.title}</span>}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={projectId}
                onChange={handleProjectChange}
                disabled={!!session && !stopping}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.client ? ` — ${p.client.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {(session || stopping) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What are you working on?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => changeDescription(e.target.value)}
                  placeholder="Describe the work…"
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {session && !stopping && (
                  <p className="text-xs text-gray-400 mt-1">Saved automatically as you type</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!session && (
                <button
                  onClick={handleStart}
                  disabled={!projectId}
                  className="flex-1 bg-indigo-600 text-white text-sm sm:text-base font-medium rounded-md px-3 py-1.5 sm:px-4 sm:py-2.5 hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  Start timer
                </button>
              )}

              {session && !stopping && (
                <button
                  onClick={() => setStopping(true)}
                  className="flex-1 bg-red-600 text-white text-sm sm:text-base font-medium rounded-md px-3 py-1.5 sm:px-4 sm:py-2.5 hover:bg-red-700 transition-colors"
                >
                  Stop
                </button>
              )}

              {session && stopping && (
                <>
                  <button
                    onClick={handleStop}
                    className="flex-1 bg-green-600 text-white text-sm sm:text-base font-medium rounded-md px-3 py-1.5 sm:px-4 sm:py-2.5 hover:bg-green-700 transition-colors"
                  >
                    Save time entry
                  </button>
                  <button
                    onClick={() => setStopping(false)}
                    className="px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Keep running
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-red-500 hover:text-red-700"
                  >
                    Discard
                  </button>
                </>
              )}
            </div>
          </div>
      </div>

      <div className="p-4 sm:p-8">
        {projectId && (
          <TaskBoard
            projectId={Number(projectId)}
            selectedTaskId={taskId}
            onSelectTask={handleTaskSelect}
            taskUpdate={taskUpdate}
          />
        )}
      </div>
    </div>
  );
}
