import { useState } from "react";
import { NotebookPen, Plus } from "lucide-react";
import { toast } from "sonner";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteFormDialog } from "@/components/notes/NoteFormDialog";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useDeleteNote, useNotes } from "@/hooks/useNotes";
import { toastError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import type { Note } from "@/types";
import { useProjectContext } from "./ProjectLayout";

type EditorState = { mode: "create" } | { mode: "edit"; note: Note } | null;

export function NotesPage() {
  const { project } = useProjectContext();
  const notes = useNotes(project._id);
  const deleteNote = useDeleteNote(project._id);
  const canManage = can(project.role, "manageNotes");

  const [editor, setEditor] = useState<EditorState>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const onConfirmDelete = () => {
    if (!noteToDelete) return;
    deleteNote.mutate(noteToDelete._id, {
      onSuccess: () => {
        toast.success("Note deleted");
        setNoteToDelete(null);
      },
      onError: (error) => toastError(error, "Couldn't delete the note"),
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Project notes</h2>
          <p className="text-sm text-slate-500">
            {canManage ? "Share decisions and context with the team." : "Only admins can add or edit notes."}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setEditor({ mode: "create" })}>
            <Plus className="size-4" aria-hidden />
            New note
          </Button>
        )}
      </div>

      {notes.isPending ? (
        <div className="space-y-4">
          {[0, 1].map((key) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : notes.isError ? (
        <ErrorState error={notes.error} onRetry={() => notes.refetch()} />
      ) : notes.data.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          description={
            canManage
              ? "Capture meeting notes, decisions and links for everyone on the project."
              : "Notes added by admins will appear here."
          }
          action={
            canManage && (
              <Button onClick={() => setEditor({ mode: "create" })}>
                <Plus className="size-4" aria-hidden />
                New note
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-4">
          {notes.data.map((note) => (
            <li key={note._id}>
              <NoteCard
                note={note}
                canManage={canManage}
                onEdit={() => setEditor({ mode: "edit", note })}
                onDelete={() => setNoteToDelete(note)}
              />
            </li>
          ))}
        </ul>
      )}

      <NoteFormDialog
        open={editor !== null}
        onClose={() => setEditor(null)}
        projectId={project._id}
        note={editor?.mode === "edit" ? editor.note : undefined}
      />
      <ConfirmDialog
        open={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        onConfirm={onConfirmDelete}
        loading={deleteNote.isPending}
        title="Delete note?"
        description="The note will be permanently removed for everyone in the project."
        confirmLabel="Delete note"
      />
    </div>
  );
}
