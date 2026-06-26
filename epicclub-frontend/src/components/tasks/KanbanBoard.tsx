'use client';

import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus } from '@/types';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';

// ─── Column Config ────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string; accent: string }[] = [
  { id: 'pending',     label: 'Pending',     color: 'border-warning/40',  accent: 'bg-warning' },
  { id: 'in_progress', label: 'In Progress', color: 'border-accent/40',   accent: 'bg-accent' },
  { id: 'completed',   label: 'Completed',   color: 'border-success/40',  accent: 'bg-success' },
];

// ─── Droppable Column ─────────────────────────────────────────────────────────

interface ColumnProps {
  id: TaskStatus;
  label: string;
  color: string;
  accent: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask?: (status: TaskStatus) => void;
  canCreate: boolean;
}

function Column({ id, label, color, accent, tasks, onTaskClick, onCreateTask, canCreate }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`flex flex-col gap-3 min-h-[500px] w-full rounded-2xl border bg-surface/50 p-4 transition-all duration-200 ${color} ${
        isOver ? 'bg-surface/80 shadow-glow-cyan/20 scale-[1.01]' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${accent} flex-shrink-0`} />
          <h3 className="text-sm font-bold text-text-primary">{label}</h3>
          <span className="w-5 h-5 rounded-full bg-surface-2 border border-border text-2xs font-bold text-text-secondary flex items-center justify-center">
            {tasks.length}
          </span>
        </div>
        {canCreate && (
          <button
            onClick={() => onCreateTask?.(id)}
            className="p-1 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10 transition-all duration-200"
            title={`Add ${label} task`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef} className="flex flex-col gap-3 flex-1">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className={`flex-1 flex items-center justify-center rounded-xl border-2 border-dashed min-h-[120px] transition-colors duration-200 ${
            isOver ? 'border-accent/50 bg-accent/5' : 'border-border/30'
          }`}>
            <span className="text-xs text-text-secondary">
              {isOver ? 'Drop here' : 'No tasks'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KanbanBoard ──────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  onCreateTask?: (status: TaskStatus) => void;
  canCreate: boolean;
}

export default function KanbanBoard({ tasks, onTaskClick, onTaskMove, onCreateTask, canCreate }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const findTaskColumn = (taskId: string): TaskStatus | null => {
    const task = tasks.find(t => t.id === taskId);
    return task?.status ?? null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = () => {
    // Column highlighting handled by useDroppable isOver
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    const validColumns = COLUMNS.map(c => c.id) as string[];
    let targetStatus: TaskStatus | null = null;

    if (validColumns.includes(overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      // Dropped over another task — find its column
      targetStatus = findTaskColumn(overId);
    }

    if (targetStatus && findTaskColumn(taskId) !== targetStatus) {
      onTaskMove(taskId, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full">
        {COLUMNS.map(col => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            color={col.color}
            accent={col.accent}
            tasks={tasksByStatus(col.id)}
            onTaskClick={onTaskClick}
            onCreateTask={onCreateTask}
            canCreate={canCreate}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 scale-105 opacity-95 shadow-glow">
            <TaskCard task={activeTask} draggable={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
