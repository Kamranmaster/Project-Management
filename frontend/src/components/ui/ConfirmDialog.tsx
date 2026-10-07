import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Input } from "./Field";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  /** When set, the user must type this text to enable the confirm button. */
  confirmationText?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  loading = false,
  confirmationText,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={null}
    >
      <ConfirmBody
        description={description}
        confirmLabel={confirmLabel}
        loading={loading}
        confirmationText={confirmationText}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </Dialog>
  );
}

function ConfirmBody({
  description,
  confirmLabel,
  loading,
  confirmationText,
  onClose,
  onConfirm,
}: Omit<ConfirmDialogProps, "open" | "title">) {
  const [typed, setTyped] = useState("");
  const confirmed = !confirmationText || typed === confirmationText;

  return (
    <div className="space-y-5">
      <div className="text-sm leading-relaxed text-slate-600">{description}</div>
      {confirmationText && (
        <label className="block space-y-1.5 text-sm text-slate-700">
          <span>
            Type <strong className="font-semibold text-slate-900">{confirmationText}</strong> to confirm
          </span>
          <Input value={typed} onChange={(event) => setTyped(event.target.value)} data-autofocus autoComplete="off" />
        </label>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading} disabled={!confirmed}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
