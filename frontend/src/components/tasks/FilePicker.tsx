import { useId, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { ATTACHMENT_LIMITS, cn, formatBytes } from "@/lib/utils";

interface FilePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** Drag-and-drop / browse file input enforcing the backend's multer limits. */
export function FilePicker({ files, onChange, disabled }: FilePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>();

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const tooLarge = Array.from(incoming).filter((file) => file.size > ATTACHMENT_LIMITS.maxBytes);
    const accepted = Array.from(incoming).filter((file) => file.size <= ATTACHMENT_LIMITS.maxBytes);
    const next = [...files, ...accepted].slice(0, ATTACHMENT_LIMITS.maxFiles);

    if (tooLarge.length > 0) {
      setError(`${tooLarge.map((file) => file.name).join(", ")} ${tooLarge.length === 1 ? "is" : "are"} larger than 1 MB.`);
    } else if (files.length + accepted.length > ATTACHMENT_LIMITS.maxFiles) {
      setError(`You can upload up to ${ATTACHMENT_LIMITS.maxFiles} files at a time.`);
    } else {
      setError(undefined);
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center text-sm transition-colors",
          dragging ? "border-brand-400 bg-brand-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <Upload className="size-5 text-slate-400" aria-hidden />
        <span className="font-medium text-slate-700">
          Drop files or <span className="text-brand-600">browse</span>
        </span>
        <span className="text-xs text-slate-500">Up to {ATTACHMENT_LIMITS.maxFiles} files, 1 MB each</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            // Allow re-selecting the same file after removing it.
            event.target.value = "";
          }}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-slate-700">{file.name}</span>
              <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={() => {
                  onChange(files.filter((_, fileIndex) => fileIndex !== index));
                  setError(undefined);
                }}
                aria-label={`Remove ${file.name}`}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
