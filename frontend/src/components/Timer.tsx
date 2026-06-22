import { useTimer } from '../context/TimerContext';
import { formatElapsed } from '../utils/dates';

export default function TimerStatus() {
  const { session, elapsed } = useTimer();

  if (!session) return null;

  return (
    <div className="mx-3 mb-2 px-3 py-2 bg-indigo-900 rounded-md">
      <p className="text-xs text-indigo-300 font-medium">● Running</p>
      <p className="text-sm font-mono font-semibold text-white">{formatElapsed(elapsed)}</p>
      <p className="text-xs text-indigo-300 truncate">{session.project?.name}</p>
      {session.task && <p className="text-xs text-indigo-400 truncate">· {session.task.title}</p>}
    </div>
  );
}
