import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { QuestionForPlayer, Answer } from '@live-trivia/shared';

interface Props {
  question: QuestionForPlayer;
  onSubmit: (answer: Answer) => void;
  disabled?: boolean;
}

function SortableItem({ id, index }: { id: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white border-2 cursor-grab active:cursor-grabbing touch-none select-none transition-colors ${
        isDragging ? 'opacity-50 border-brand-300 shadow-lg' : 'border-gray-200'
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold text-sm flex items-center justify-center">
        {index + 1}
      </span>
      <span className="flex-1 font-medium text-slate-700">{id}</span>
      <span className="text-slate-300 text-lg">&#x2630;</span>
    </div>
  );
}

export default function RankingInput({ question, onSubmit, disabled }: Props) {
  const shuffled = useMemo(() => {
    const items = [...(question.items || [])];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [question.items]);

  const [items, setItems] = useState<string[]>(shuffled);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  const handleSubmit = () => {
    onSubmit({ type: 'ranking', orderedItems: items });
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-slate-400 text-sm font-medium">Drag to reorder</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableItem key={item} id={item} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full py-3.5 rounded-xl bg-brand-300 text-slate-900 font-semibold hover:bg-brand-400 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        Submit Answer
      </button>
    </div>
  );
}
