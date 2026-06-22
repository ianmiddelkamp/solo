import { useEffect, useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  getTaskGroups,
  createTaskGroup,
  updateTaskGroup,
  deleteTaskGroup,
  reorderTaskGroups,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
} from '../api/tasks';
import { confirm } from '../services/dialog';
import SowImport from './SowImport';
import { useFeatures } from '../context/FeaturesContext';
import type { Task, TaskGroup } from '../types';

const STATUSES = ['todo', 'in_progress', 'done'] as const;
type Status = typeof STATUSES[number];

const STATUS_LABEL: Record<Status, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};
const STATUS_ACTIVE_CLASS: Record<Status, string> = {
  todo: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

interface DragTaskData {
  type: 'task';
  task: Task;
  groupId: number;
}
interface DragGroupData {
  type: 'group';
  group: TaskGroup;
}
type DragData = DragTaskData | DragGroupData;

interface TaskPatch {
  id: number;
  patch: Partial<Task>;
}

interface StatusSelectProps {
  status: string;
  onChange: (value: string) => void;
}

function StatusSelect({ status, onChange }: StatusSelectProps) {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      className={`text-xs font-medium rounded px-1.5 py-0.5 border-0 outline-none cursor-pointer ${STATUS_ACTIVE_CLASS[status as Status] ?? ''}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}

interface TaskItemProps {
  task: Task;
  projectId: number;
  groupId: number;
  onUpdate: (id: number, patch: Partial<Task>) => void;
  onDelete: (id: number) => void;
  onSelect?: ((id: number | null) => void) | null;
  selected: boolean;
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  isDragging: boolean;
}

function TaskItem({ task, projectId, groupId, onUpdate, onDelete, onSelect, selected, attributes, listeners, isDragging }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [estimate, setEstimate] = useState(task.estimated_hours != null ? String(task.estimated_hours) : '');
  const inputRef = useRef<HTMLInputElement>(null);
  const estimateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (editingEstimate) estimateRef.current?.focus();
  }, [editingEstimate]);

  async function commitTitle() {
    setEditing(false);
    if (title.trim() === task.title) return;
    if (!title.trim()) { setTitle(task.title); return; }
    await updateTask(projectId, groupId, task.id, { title: title.trim() });
    onUpdate(task.id, { title: title.trim() });
  }

  async function handleStatusChange(next: string) {
    await updateTask(projectId, groupId, task.id, { status: next });
    onUpdate(task.id, { status: next });
  }

  async function commitEstimate() {
    setEditingEstimate(false);
    const parsed = estimate.trim() === '' ? null : parseFloat(estimate);
    const current = task.estimated_hours != null ? parseFloat(String(task.estimated_hours)) : null;
    if (parsed === current) return;
    if (estimate.trim() !== '' && (parsed === null || isNaN(parsed) || parsed <= 0)) {
      setEstimate(current != null ? String(current) : '');
      return;
    }
    await updateTask(projectId, groupId, task.id, { estimated_hours: parsed });
    onUpdate(task.id, { estimated_hours: parsed });
  }

  async function handleDelete() {
    if (!await confirm('Delete this task?')) return;
    await deleteTask(projectId, groupId, task.id);
    onDelete(task.id);
  }

  return (
    <div className={`rounded px-2 py-2 group transition-colors ${selected ? 'bg-indigo-50 ring-1 ring-indigo-300' : ''} ${isDragging ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-2">
        <button
          {...(attributes as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          {...(listeners as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
        {editing ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') { setTitle(task.title); setEditing(false); }
            }}
            className="flex-1 text-sm border-b border-indigo-400 outline-none bg-transparent"
          />
        ) : (
          <span
            className={`flex-1 text-sm cursor-pointer hover:text-indigo-700 ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}
            onClick={() => setEditing(true)}
          >
            {task.title}
          </span>
        )}
        {onSelect && (
          <button
            onClick={() => onSelect(selected ? null : task.id)}
            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded font-medium transition-colors ${
              selected ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-indigo-600'
            }`}
            title={selected ? 'Deselect task' : 'Select for timer'}
          >
            {selected ? '● Selected' : 'Select'}
          </button>
        )}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs flex-shrink-0"
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>
      <div className="mt-1.5 ml-6 flex items-center gap-3 flex-wrap">
        <StatusSelect status={task.status} onChange={handleStatusChange} />
        {editingEstimate ? (
          <input
            ref={estimateRef}
            type="number"
            min="0.01"
            step="0.25"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            onBlur={commitEstimate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEstimate();
              if (e.key === 'Escape') { setEstimate(task.estimated_hours != null ? String(task.estimated_hours) : ''); setEditingEstimate(false); }
            }}
            placeholder="0.00"
            className="w-16 text-xs border-b border-indigo-400 outline-none bg-transparent text-gray-700"
          />
        ) : (
          <button
            onClick={() => setEditingEstimate(true)}
            className="text-xs text-gray-400 hover:text-indigo-600"
            title="Set estimate"
          >
            {task.estimated_hours != null ? `est. ${parseFloat(String(task.estimated_hours))}h` : '+ est.'}
          </button>
        )}
        {task.actual_hours > 0 && (
          <span className="text-xs text-gray-500" title="Actual time logged">
            actual {parseFloat(String(task.actual_hours))}h
          </span>
        )}
        {task.last_entry_date && (
          <span className="text-xs text-gray-400" title="Date of last time entry">
            {new Date(task.last_entry_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

interface SortableTaskProps {
  task: Task;
  projectId: number;
  groupId: number;
  onUpdate: (id: number, patch: Partial<Task>) => void;
  onDelete: (id: number) => void;
  onSelect?: ((id: number | null) => void) | null;
  selected: boolean;
}

function SortableTask({ task, projectId, groupId, onUpdate, onDelete, onSelect, selected }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', task, groupId } satisfies DragTaskData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItem
        task={task}
        projectId={projectId}
        groupId={groupId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onSelect={onSelect}
        selected={selected}
        attributes={attributes as Record<string, unknown>}
        listeners={listeners as Record<string, unknown> | undefined}
        isDragging={isDragging}
      />
    </div>
  );
}

interface TaskGroupCardProps {
  group: TaskGroup;
  projectId: number;
  onUpdateGroup: (id: number, patch: Partial<TaskGroup>) => void;
  onDeleteGroup: (id: number) => void;
  onMergeUp: (() => void) | null;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
  onAddTask: (groupId: number, task: Task) => void;
  onUpdateTask: (groupId: number, taskId: number, patch: Partial<Task>) => void;
  onDeleteTask: (groupId: number, taskId: number) => void;
  onSelectTask?: ((id: number | null) => void) | null;
  selectedTaskId?: number | null;
}

function TaskGroupCard({ group, projectId, onUpdateGroup, onDeleteGroup, onMergeUp, onMoveUp, onMoveDown, onAddTask, onUpdateTask, onDeleteTask, onSelectTask, selectedTaskId }: TaskGroupCardProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(group.title);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const newTaskRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (addingTask) newTaskRef.current?.focus();
  }, [addingTask]);

  async function commitGroupTitle() {
    setEditingTitle(false);
    if (title.trim() === group.title) return;
    if (!title.trim()) { setTitle(group.title); return; }
    await updateTaskGroup(projectId, group.id, { title: title.trim() });
    onUpdateGroup(group.id, { title: title.trim() });
  }

  async function handleDeleteGroup() {
    if (!await confirm(`Delete "${group.title}" and all its tasks?`)) return;
    await deleteTaskGroup(projectId, group.id);
    onDeleteGroup(group.id);
  }

  async function submitNewTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const task = await createTask(projectId, group.id, { title: newTaskTitle.trim() });
    if (task) onAddTask(group.id, task);
    setNewTaskTitle('');
  }

  const taskIds = group.tasks.map((t) => `task-${t.id}`);

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `group-drop-${group.id}`,
    data: { type: 'group', group } satisfies DragGroupData,
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <div className="flex flex-col">
          <button onClick={onMoveUp ?? undefined} disabled={!onMoveUp} className="text-gray-300 hover:text-gray-500 disabled:opacity-0 leading-none text-xs" aria-label="Move group up">▲</button>
          <button onClick={onMoveDown ?? undefined} disabled={!onMoveDown} className="text-gray-300 hover:text-gray-500 disabled:opacity-0 leading-none text-xs" aria-label="Move group down">▼</button>
        </div>
        {editingTitle ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitGroupTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitGroupTitle();
              if (e.key === 'Escape') { setTitle(group.title); setEditingTitle(false); }
            }}
            className="flex-1 font-semibold text-sm border-b border-indigo-400 outline-none bg-transparent"
          />
        ) : (
          <span
            className="flex-1 font-semibold text-sm text-gray-800 cursor-pointer hover:text-indigo-700"
            onClick={() => setEditingTitle(true)}
          >
            {group.title}
          </span>
        )}
        <span className="text-xs text-gray-400">
          {group.tasks.length}
          {(() => {
            const est = parseFloat(String(group.estimated_hours_total)) || 0;
            const actual = parseFloat(String(group.actual_hours_total)) || 0;
            const fmt = (n: number) => n % 1 === 0 ? `${n}h` : `${n.toFixed(2)}h`;
            if (actual > 0 && est > 0) return ` · ${fmt(actual)} / ${fmt(est)}`;
            if (est > 0) return ` · est. ${fmt(est)}`;
            if (actual > 0) return ` · ${fmt(actual)}`;
            return '';
          })()}
        </span>
        {onMergeUp && (
          <button
            onClick={onMergeUp}
            className="text-xs text-gray-400 hover:text-indigo-600"
            aria-label="Merge into group above"
            title="Merge into group above"
          >
            ↑ Merge
          </button>
        )}
        <button
          onClick={handleDeleteGroup}
          className="text-red-400 hover:text-red-600 text-xs"
          aria-label="Delete group"
        >
          ✕
        </button>
      </div>

      <div ref={setDropRef} className={`px-1 py-1 rounded-b-lg transition-colors ${isOver ? 'bg-indigo-50' : ''}`}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {group.tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              projectId={projectId}
              groupId={group.id}
              onUpdate={(id, patch) => onUpdateTask(group.id, id, patch)}
              onDelete={(id) => onDeleteTask(group.id, id)}
              onSelect={onSelectTask}
              selected={Number(selectedTaskId) === task.id}
            />
          ))}
        </SortableContext>

        {addingTask ? (
          <form onSubmit={submitNewTask} className="flex items-center gap-2 px-2 py-1">
            <input
              ref={newTaskRef}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onBlur={() => { if (!newTaskTitle.trim()) setAddingTask(false); }}
              onKeyDown={(e) => { if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle(''); } }}
              placeholder="Task name…"
              className="flex-1 text-sm border-b border-gray-300 outline-none bg-transparent py-0.5"
            />
            <button type="submit" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Add</button>
            <button type="button" onClick={() => { setAddingTask(false); setNewTaskTitle(''); }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </form>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="w-full text-left px-2 py-1 text-xs text-gray-400 hover:text-indigo-600"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}

interface TaskBoardProps {
  projectId: number;
  selectedTaskId?: number | null;
  onSelectTask?: ((id: number | null) => void) | null;
  taskUpdate?: TaskPatch | TaskPatch[] | null;
}

export default function TaskBoard({ projectId, selectedTaskId, onSelectTask, taskUpdate }: TaskBoardProps) {
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [activeTask, setActiveTask] = useState<DragData | null>(null);
  const features = useFeatures();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!projectId) return;
    getTaskGroups(projectId).then((data) => { if (data) setGroups(data); });
  }, [projectId]);

  useEffect(() => {
    if (!taskUpdate) return;
    const updates = Array.isArray(taskUpdate) ? taskUpdate : [taskUpdate];
    updates.forEach((u) => {
      const taskId = Number(u.id);
      setGroups((prev) => {
        let groupId: number | null = null;
        const next = prev.map((g) => {
          const task = g.tasks.find((t) => t.id === taskId);
          if (task) groupId = g.id;
          return { ...g, tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, ...u.patch } : t)) };
        });
        if (groupId) updateTask(projectId, groupId, taskId, u.patch).catch(() => {});
        return next;
      });
    });
  }, [taskUpdate]);

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupTitle.trim()) return;
    const group = await createTaskGroup(projectId, { title: newGroupTitle.trim() });
    if (group) setGroups((prev) => [...prev, { ...group, tasks: [] }]);
    setNewGroupTitle('');
  }

  function handleUpdateGroup(id: number, patch: Partial<TaskGroup>) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function handleDeleteGroup(id: number) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleMoveUp(id: number) {
    const idx = groups.findIndex((g) => g.id === id);
    if (idx <= 0) return;
    const reordered = arrayMove(groups, idx, idx - 1);
    setGroups(reordered);
    await reorderTaskGroups(projectId, reordered.map((g) => g.id));
  }

  async function handleMoveDown(id: number) {
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1 || idx >= groups.length - 1) return;
    const reordered = arrayMove(groups, idx, idx + 1);
    setGroups(reordered);
    await reorderTaskGroups(projectId, reordered.map((g) => g.id));
  }

  async function handleMergeUp(id: number) {
    const idx = groups.findIndex((g) => g.id === id);
    if (idx <= 0) return;
    const target = groups[idx - 1];
    const src = groups[idx];
    if (!await confirm(`Merge "${src.title}" into "${target.title}"? This cannot be undone.`, { confirmLabel: 'Merge' })) return;
    const mergedTasks = [...target.tasks, ...src.tasks];
    const mergedIds = mergedTasks.map((t) => t.id);
    setGroups((prev) =>
      prev
        .map((g) => (g.id === target.id ? { ...g, tasks: mergedTasks } : g))
        .filter((g) => g.id !== src.id)
    );
    await reorderTasks(projectId, src.id, mergedIds, target.id);
    await deleteTaskGroup(projectId, src.id);
  }

  function handleAddTask(groupId: number, task: Task) {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, tasks: [...g.tasks, task] } : g))
    );
  }

  function handleUpdateTask(groupId: number, taskId: number, patch: Partial<Task>) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
          : g
      )
    );
  }

  function handleDeleteTask(groupId: number, taskId: number) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) } : g
      )
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(event.active.data.current as DragData);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as DragData;
    const overData = over.data.current as DragData | undefined;

    if (activeData.type === 'task') {
      const srcGroupId = activeData.groupId;
      const srcGroup = groups.find((g) => g.id === srcGroupId);
      if (!srcGroup) return;

      let dstGroupId = srcGroupId;
      if (overData?.type === 'task') dstGroupId = overData.groupId;
      if (overData?.type === 'group') dstGroupId = overData.group.id;

      if (srcGroupId === dstGroupId) {
        const group = groups.find((g) => g.id === srcGroupId);
        if (!group) return;
        const oldIdx = group.tasks.findIndex((t) => `task-${t.id}` === active.id);
        const newIdx = group.tasks.findIndex((t) => `task-${t.id}` === over.id);
        if (oldIdx === -1 || newIdx === -1) return;
        const reordered = arrayMove(group.tasks, oldIdx, newIdx);
        setGroups((prev) =>
          prev.map((g) => (g.id === srcGroupId ? { ...g, tasks: reordered } : g))
        );
        await reorderTasks(projectId, srcGroupId, reordered.map((t) => t.id), srcGroupId);
      } else {
        const task = srcGroup.tasks.find((t) => `task-${t.id}` === active.id);
        if (!task) return;
        const newSrcTasks = srcGroup.tasks.filter((t) => t.id !== task.id);
        const dstGroup = groups.find((g) => g.id === dstGroupId);
        if (!dstGroup) return;
        const overTaskIdx = dstGroup.tasks.findIndex((t) => `task-${t.id}` === over.id);
        const newDstTasks = [...dstGroup.tasks];
        newDstTasks.splice(overTaskIdx >= 0 ? overTaskIdx : newDstTasks.length, 0, task);
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id === srcGroupId) return { ...g, tasks: newSrcTasks };
            if (g.id === dstGroupId) return { ...g, tasks: newDstTasks };
            return g;
          })
        );
        await reorderTasks(projectId, srcGroupId, newDstTasks.map((t) => t.id), dstGroupId);
      }
    }
  }

  return (
    <div className="max-w-[750px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Groups</h3>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {groups.map((group, idx) => (
            <TaskGroupCard
              key={group.id}
              group={group}
              projectId={projectId}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              onMoveUp={idx > 0 ? () => handleMoveUp(group.id) : null}
              onMoveDown={idx < groups.length - 1 ? () => handleMoveDown(group.id) : null}
              onMergeUp={idx > 0 ? () => handleMergeUp(group.id) : null}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onSelectTask={onSelectTask}
              selectedTaskId={selectedTaskId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask?.type === 'task' && (
            <div className="bg-white rounded border border-indigo-300 shadow-lg px-2 py-1.5 opacity-90">
              <span className="text-sm">{activeTask.task.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <form onSubmit={addGroup} className="mt-4 flex gap-2">
        <input
          value={newGroupTitle}
          onChange={(e) => setNewGroupTitle(e.target.value)}
          placeholder="New group name…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!newGroupTitle.trim()}
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-40"
        >
          Add group
        </button>
      </form>

      {features.sow_import && <SowImport projectId={projectId} onImported={() => getTaskGroups(projectId).then((data) => { if (data) setGroups(data); })} />}
    </div>
  );
}
