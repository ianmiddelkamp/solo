import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getTimer, startTimer, stopTimer, updateTimer, cancelTimer } from '../api/timer';
import { elapsedSeconds } from '../utils/dates';
import type { TimerSession } from '../types';

interface TimerContextValue {
  session: TimerSession | null;
  elapsed: number;
  projectId: string;
  taskId: number | null;
  description: string;
  loading: boolean;
  setProjectId: (id: string) => void;
  setTaskId: (id: number | null) => void;
  changeDescription: (value: string) => void;
  replaceTask: (tid: number) => Promise<void>;
  start: (pid: number, tid: number | null) => Promise<void>;
  stop: (pid: number, desc: string) => Promise<void>;
  cancel: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [session, setSession]           = useState<TimerSession | null>(null);
  const [elapsed, setElapsed]           = useState(0);
  const [projectId, setProjectId]       = useState('');
  const [taskId, setTaskId]             = useState<number | null>(null);
  const [description, setDescription]   = useState('');
  const [loading, setLoading]           = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getTimer()
      .then((active) => {
        if (active) {
          setSession(active);
          setProjectId(String(active.project_id));
          setTaskId(active.task_id || null);
          setDescription(active.description || '');
          setElapsed(elapsedSeconds(active.started_at));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setElapsed(elapsedSeconds(session.started_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  async function start(pid: number, tid: number | null) {
    const active = await startTimer(pid, tid);
    if (!active) return;
    setSession(active);
    setProjectId(String(active.project_id));
    setTaskId(active.task_id || null);
    setDescription('');
    setElapsed(0);
  }

  async function stop(pid: number, desc: string) {
    await stopTimer(pid, desc);
    setSession(null);
    setElapsed(0);
    setDescription('');
    setTaskId(null);
  }

  async function cancel() {
    await cancelTimer();
    setSession(null);
    setElapsed(0);
    setDescription('');
    setTaskId(null);
  }

  function changeDescription(value: string) {
    setDescription(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateTimer(value), 800);
  }

  async function replaceTask(tid: number) {
    const updated = await updateTimer(description, tid);
    if (!updated) return;
    setSession(updated);
    setTaskId(updated.task_id || null);
  }

  return (
    <TimerContext.Provider value={{
      session, elapsed, projectId, taskId, description, loading,
      setProjectId, setTaskId, changeDescription, replaceTask,
      start, stop, cancel,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
