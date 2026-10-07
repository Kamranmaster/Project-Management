import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormAlert, FormField, Textarea } from "@/components/ui/Field";
import { useCreateNote, useUpdateNote } from "@/hooks/useNotes";
import { applyApiErrorToForm } from "@/lib/errors";
import type { Note } from "@/types";

// The API accepts JSON bodies up to 16 KB; keep notes comfortably below that.
const MAX_LENGTH = 10_000;

const schema = z.object({
  content: z.string().trim().min(1, "Write something first").max(MAX_LENGTH, `Use at most ${MAX_LENGTH} characters`),
});
type NoteValues = z.infer<typeof schema>;

interface NoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  note?: Note;
}

export function NoteFormDialog({ open, onClose, projectId, note }: NoteFormDialogProps) {
  const formId = useId();
  const createNote = useCreateNote(projectId);
  const updateNote = useUpdateNote(projectId);
  const pending = createNote.isPending || updateNote.isPending;

  return (
    <Dialog
      open={open}
      onClose={pending ? () => {} : onClose}
      title={note ? "Edit note" : "New note"}
      description="Notes are visible to everyone in the project."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {note ? "Save note" : "Add note"}
          </Button>
        </>
      }
    >
      <NoteForm
        formId={formId}
        note={note}
        submit={async (content) => {
          if (note) await updateNote.mutateAsync({ noteId: note._id, content });
          else await createNote.mutateAsync(content);
          toast.success(note ? "Note updated" : "Note added");
          onClose();
        }}
      />
    </Dialog>
  );
}

function NoteForm({ formId, note, submit }: { formId: string; note?: Note; submit: (content: string) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<NoteValues>({ resolver: zodResolver(schema), defaultValues: { content: note?.content ?? "" } });

  const length = watch("content").length;

  const onSubmit = handleSubmit(({ content }) =>
    submit(content).catch((error) => applyApiErrorToForm(error, setError, { fields: ["content"] })),
  );

  return (
    <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={errors.root?.server?.message} />
      <FormField
        label="Note"
        error={errors.content?.message}
        hint={<span className="tabular-nums">{length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}</span>}
      >
        {(field) => (
          <Textarea
            {...field}
            {...register("content")}
            data-autofocus
            rows={10}
            placeholder="Decisions, meeting notes, links, context…"
          />
        )}
      </FormField>
    </form>
  );
}
