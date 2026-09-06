import type { BillingProject, EstimateLineItem } from '../types';

// Mirrors EstimateLineItem#done?/#show_actual_hours?/#display_hours/#display_amount on the
// backend (app/models/estimate_line_item.rb) — keep both in sync.
export function isDone(item: EstimateLineItem): boolean {
  return item.task?.status === 'done';
}

// Fixed Price never substitutes actual hours, regardless of the project's show_actual_hours
// setting — see EstimateLineItem#show_actual_hours? for why.
export function effectiveShowActualHours(project: BillingProject | null | undefined): boolean {
  return (project?.show_actual_hours ?? true) && project?.billing_mode !== 'fixed_price';
}

export function displayHours(item: EstimateLineItem, showActualHours: boolean): number {
  return isDone(item) && showActualHours ? (item.task?.actual_hours ?? 0) : item.hours;
}

export function displayAmount(item: EstimateLineItem, showActualHours: boolean): number {
  return isDone(item) && showActualHours ? displayHours(item, showActualHours) * item.rate : item.amount;
}

// A row actually rendered on screen — either a real line item, or a synthetic summary row
// standing in for several task lines once "show task breakdown" is off. Mirrors
// consolidate_estimate_items in app/views/pdfs/_line_items_table.html.erb — keep both in sync.
export interface DisplayRow {
  id: string;
  description: string;
  hours: number;
  originalHours: number; // pre-substitution estimated hours, for the "est. X → actual Y" annotation
  rate: number | null;
  amount: number;
  isDisbursement: boolean;
  done: boolean;
  substituted: boolean; // done, and its hours were replaced by actual_hours (for the "est. → actual" annotation)
}

// Collapses each Task Group's per-task lines into one summary row per group, named after the
// group rather than a bare task count — mirrors consolidate_estimate_items in
// app/views/pdfs/_line_items_table.html.erb, keep both in sync. A line with no task at all (e.g.
// a Fixed Price adjustment line) has no group to fold into, so it's always left on its own.
function consolidateByTaskGroup(taskItems: EstimateLineItem[], showActualHours: boolean): DisplayRow[] {
  const groupable = taskItems.filter((i) => i.task?.task_group);
  const ungroupable = taskItems.filter((i) => !i.task?.task_group);

  const groups = new Map<number, { title: string; position: number; items: EstimateLineItem[] }>();
  for (const item of groupable) {
    const group = item.task!.task_group!;
    if (!groups.has(group.id)) groups.set(group.id, { title: group.title, position: group.position, items: [] });
    groups.get(group.id)!.items.push(item);
  }

  const groupRows: DisplayRow[] = [...groups.values()]
    .sort((a, b) => a.position - b.position)
    .map((group) => ({
      id: `group-${group.title}`,
      description: group.title,
      hours: group.items.reduce((sum, i) => sum + displayHours(i, showActualHours), 0),
      originalHours: group.items.reduce((sum, i) => sum + i.hours, 0),
      rate: null,
      amount: group.items.reduce((sum, i) => sum + displayAmount(i, showActualHours), 0),
      isDisbursement: false,
      done: false,
      substituted: false,
    }));

  const ungroupableRows: DisplayRow[] = ungroupable.map((item) => {
    const hours = displayHours(item, showActualHours);
    return {
      id: String(item.id),
      description: item.description || '—',
      hours,
      originalHours: item.hours,
      rate: item.rate,
      amount: displayAmount(item, showActualHours),
      isDisbursement: false,
      done: isDone(item),
      substituted: isDone(item) && hours !== item.hours,
    };
  });

  return [...groupRows, ...ungroupableRows];
}

export function visibleRows(items: EstimateLineItem[], showTaskBreakdown: boolean, showActualHours: boolean): DisplayRow[] {
  const disbursementItems = items.filter((i) => Boolean(i.disbursement));
  const taskItems = items.filter((i) => !i.disbursement);

  const taskRows: DisplayRow[] = showTaskBreakdown
    ? taskItems.map((item) => {
        const hours = displayHours(item, showActualHours);
        return {
          id: String(item.id),
          description: item.description || '—',
          hours,
          originalHours: item.hours,
          rate: item.rate,
          amount: displayAmount(item, showActualHours),
          isDisbursement: false,
          done: isDone(item),
          substituted: isDone(item) && hours !== item.hours,
        };
      })
    : consolidateByTaskGroup(taskItems, showActualHours);

  const disbursementRows: DisplayRow[] = disbursementItems.map((item) => ({
    id: String(item.id),
    description: item.description || '—',
    hours: item.hours,
    originalHours: item.hours,
    rate: item.rate,
    amount: item.amount,
    isDisbursement: true,
    done: false,
    substituted: false,
  }));

  return [...taskRows, ...disbursementRows];
}
