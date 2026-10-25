"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { deleteEntity, reorder, setFeatured, setPublished } from "@/app/admin/actions/content";
import type { ContentTable } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./ui";

export interface Row {
  id: string;
  title: string;
  subtitle?: string;
  published: boolean;
  featured?: boolean;
}

function Item({ row, table, showFeatured, onChange, onDelete }: { row: Row; table: ContentTable; showFeatured: boolean; onChange: (r: Row) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const [pending, start] = useTransition();
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className={cn("flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5", isDragging && "opacity-60 shadow-md")}>
      <button type="button" className="cursor-grab touch-none text-ink-4 hover:text-ink" aria-label="ドラッグして並べ替え" {...attributes} {...listeners}>
        <GripVertical size={18} />
      </button>
      <div className="min-w-0 flex-1">
        <Link href={`/admin/${table}/${row.id}`} className="block truncate text-sm font-bold text-ink no-underline hover:text-navy">
          {row.title}
        </Link>
        {row.subtitle && <p className="truncate text-xs text-ink-3">{row.subtitle}</p>}
      </div>
      {showFeatured && (
        <label className="flex items-center gap-1 text-xs text-ink-3">
          <input
            type="checkbox"
            checked={!!row.featured}
            disabled={pending}
            onChange={(e) => {
              const featured = e.target.checked;
              onChange({ ...row, featured });
              start(async () => {
                await setFeatured(row.id, featured);
              });
            }}
            className="accent-navy"
          />
          注目
        </label>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const published = !row.published;
          onChange({ ...row, published });
          start(async () => {
            await setPublished(table, row.id, published);
          });
        }}
        className="rounded-full"
        aria-label={row.published ? "非公開にする" : "公開する"}
      >
        <StatusBadge ok={row.published}>{row.published ? "公開" : "非公開"}</StatusBadge>
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`「${row.title}」を削除します。よろしいですか？`)) return;
          start(async () => {
            const r = await deleteEntity(table, row.id);
            if (r.ok) onDelete(row.id);
            else alert(r.message);
          });
        }}
        className="text-ink-4 hover:text-red"
        aria-label="削除"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

export function SortableList({ table, rows: initial, showFeatured = false }: { table: ContentTable; rows: Row[]; showFeatured?: boolean }) {
  const [rows, setRows] = useState(initial);
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r.id === active.id);
    const to = rows.findIndex((r) => r.id === over.id);
    const next = arrayMove(rows, from, to);
    setRows(next);
    start(async () => {
      const r = await reorder({ table, ids: next.map((x) => x.id) });
      if (!r.ok) alert(r.message);
    });
  }

  function onChange(updated: Row) {
    setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
  }
  function onDelete(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  if (rows.length === 0) return <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-3">まだ登録がありません</p>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex list-none flex-col gap-2 p-0">
          {rows.map((r) => (
            <Item key={r.id} row={r} table={table} showFeatured={showFeatured} onChange={onChange} onDelete={onDelete} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
