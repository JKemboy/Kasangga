import { Paperclip } from "lucide-react";
import {
  evidenceAccept,
  evidenceHelp,
  validateEvidence,
} from "../../services/incidentEvidence.js";
export default function EvidencePicker({
  files,
  onChange,
  onError,
  disabled = false,
  attachmentCard = false,
}) {
  return (
    <div className="space-y-2">
      <label
        className={
          attachmentCard
            ? "relative block cursor-pointer rounded-lg border border-dashed border-green-300 bg-green-50/40 p-5 text-center text-green-900"
            : "block"
        }
      >
        {attachmentCard ? (
          <>
            <span className="block text-left text-xs font-semibold mb-3">
              Evidence (required)
            </span>
            <Paperclip size={30} className="mx-auto mb-2" />
            <span className="block text-sm font-semibold">
              Attach screenshots, videos or files
            </span>
          </>
        ) : (
          "Evidence (required)"
        )}
        <input
          aria-label="Evidence files"
          className={
            attachmentCard
              ? "absolute inset-0 h-full w-full cursor-pointer opacity-0"
              : "block w-full rounded border p-2"
          }
          type="file"
          required={!files.length}
          multiple
          accept={evidenceAccept}
          disabled={disabled}
          onChange={(event) => {
            const next = [...files, ...event.target.files];
            event.target.value = "";
            try {
              validateEvidence(next);
              onChange(next);
              onError("");
            } catch (error) {
              onError(error.message);
            }
          }}
        />
      </label>
      <small className="block">{evidenceHelp}</small>
      {files.map((file, index) => (
        <div key={index} className="flex justify-between gap-2">
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(files.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
