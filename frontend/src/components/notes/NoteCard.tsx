import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { displayName, formatDateTime, formatRelative } from "@/lib/utils";
import type { Note } from "@/types";

interface NoteCardProps {
  note: Note;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function NoteCard({ note, canManage, onEdit, onDelete }: NoteCardProps) {
  const edited = note.updatedAt !== note.createdAt;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <header className="flex items-start gap-3">
        <Avatar user={note.createdBy} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{displayName(note.createdBy)}</p>
          <p className="text-xs text-slate-500">
            <time dateTime={note.createdAt} title={formatDateTime(note.createdAt)}>
              {formatRelative(note.createdAt)}
            </time>
            {edited && (
              <span title={`Edited ${formatDateTime(note.updatedAt)}`}> · edited</span>
            )}
          </p>
        </div>
        {canManage && (
          <DropdownMenu
            triggerLabel="Note actions"
            triggerClassName="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            trigger={<MoreHorizontal className="size-4" />}
            items={[
              { label: "Edit", icon: Pencil, onSelect: onEdit },
              { label: "Delete", icon: Trash2, danger: true, onSelect: onDelete },
            ]}
          />
        )}
      </header>
      <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word text-slate-700">{note.content}</p>
    </article>
  );
}
