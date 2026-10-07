import { ExternalLink, FileText, ImageIcon, Paperclip } from "lucide-react";
import { attachmentName, formatBytes } from "@/lib/utils";
import type { Attachment } from "@/types";

const isImage = (attachment: Attachment) =>
  attachment.mimeType?.startsWith("image/") ?? /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment.url);

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <Paperclip className="size-4" aria-hidden />
        No attachments
      </p>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {attachments.map((attachment, index) => {
        const name = attachmentName(attachment.url);
        const image = isImage(attachment);
        return (
          <li key={attachment._id ?? `${attachment.url}-${index}`}>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-500">
                {image ? (
                  <img src={attachment.url} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <FileText className="size-5" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{name}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  {image && <ImageIcon className="size-3" aria-hidden />}
                  {formatBytes(attachment.size)}
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
