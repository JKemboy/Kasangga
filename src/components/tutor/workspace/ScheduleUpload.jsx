import { useEffect, useRef, useState } from "react";
import { Download, FileText, Upload } from "lucide-react";
import { Modal, button, primary } from "./ui.jsx";
import {
  saveScheduleDraft,
  scheduleFileError,
  scheduleFileSize,
  scheduleFileStore,
} from "./scheduleUploads.js";

export default function ScheduleUpload({ data, update, onClose }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [unavailable, setUnavailable] = useState({});
  const active = useRef(true);
  const downloadUrls = useRef(new Set());
  const downloadTimers = useRef(new Set());
  const drafts = [...(data.uploads || [])].reverse();

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      for (const timer of downloadTimers.current) clearTimeout(timer);
      for (const url of downloadUrls.current) URL.revokeObjectURL(url);
    };
  }, []);

  function close() {
    active.current = false;
    onClose();
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    const validation = scheduleFileError(file);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await saveScheduleDraft(file, update, {
        isCancelled: () => !active.current,
      });
      if (saved && active.current) close();
    } catch (failure) {
      if (active.current)
        setError(
          failure.message || "Could not save the file. Please try again.",
        );
    } finally {
      if (active.current) setSaving(false);
    }
  }

  async function download(draft, key) {
    setDownloading(key);
    setError("");
    try {
      const saved = draft.id ? await scheduleFileStore.load(draft.id) : null;
      if (!active.current) return;
      if (!(saved instanceof Blob)) {
        setUnavailable((previous) => ({ ...previous, [key]: true }));
        return;
      }
      const url = URL.createObjectURL(saved);
      downloadUrls.current.add(url);
      const link = document.createElement("a");
      link.href = url;
      link.download = draft.name || "class-schedule";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Leave time for the browser to start reading the file before revoking it.
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        downloadUrls.current.delete(url);
        downloadTimers.current.delete(timer);
      }, 1000);
      downloadTimers.current.add(timer);
    } catch {
      if (active.current)
        setError("Could not open this saved file. Please try again.");
    } finally {
      if (active.current) setDownloading(null);
    }
  }

  return (
    <Modal title="Upload Updated Class Schedule" onClose={close}>
      <form className="space-y-3 text-xs" onSubmit={save} aria-busy={saving}>
        <p className="leading-5 text-[#45516e]">
          Save your updated schedule on this browser. Your confirmed schedule
          stays in place until a new schedule is reviewed.
        </p>
        <label className="block rounded-lg border border-dashed border-green-700/40 bg-green-50/40 p-4">
          <span className="mb-2 flex items-center gap-2 font-semibold text-green-900">
            <Upload className="h-4 w-4" />
            Choose a class schedule
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"
            aria-label="Class schedule file"
            aria-describedby="schedule-file-help schedule-upload-error"
            disabled={saving}
            className="block w-full min-w-0 text-xs text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-green-800 file:px-3 file:py-2 file:font-semibold file:text-white"
            onChange={(event) => {
              const selected = event.target.files?.[0] || null;
              setFile(selected);
              setError(selected ? scheduleFileError(selected) : "");
            }}
          />
          <span id="schedule-file-help" className="mt-2 block text-slate-500">
            PNG, JPEG, or PDF · Up to 5 MB
          </span>
        </label>

        {file && (
          <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3">
            <FileText className="h-5 w-5 shrink-0 text-green-800" />
            <div className="min-w-0">
              <p className="break-all font-semibold">{file.name}</p>
              <p className="mt-0.5 text-slate-500">
                {scheduleFileSize(file.size)}
              </p>
            </div>
          </div>
        )}

        <p className="rounded-md bg-amber-50 px-3 py-2 leading-5 text-amber-900">
          Draft only. Online submission and review are not connected yet.
        </p>
        <p id="schedule-upload-error" role="alert" className="text-red-700">
          {error}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primary} disabled={!file || saving}>
            {saving ? "Saving…" : "Save Schedule Draft"}
          </button>
          <button type="button" className={button} onClick={close}>
            Cancel
          </button>
        </div>
      </form>

      {drafts.length > 0 && (
        <section className="mt-4 border-t border-slate-200 pt-3">
          <h3 className="text-xs font-semibold">Previous schedule drafts</h3>
          <ul className="mt-2 max-h-44 space-y-2 overflow-y-auto">
            {drafts.map((draft, index) => {
              const key = draft.id || `legacy-${index}`;
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 p-2.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-medium">{draft.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {scheduleFileSize(draft.size)} · Draft
                    </p>
                    {unavailable[key] && (
                      <p
                        role="status"
                        className="mt-1 text-[11px] text-amber-800"
                      >
                        File unavailable on this browser. Choose it again to
                        save a new draft.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`${button} inline-flex items-center gap-1.5`}
                    aria-label={`Download ${draft.name}`}
                    disabled={Boolean(downloading) || unavailable[key]}
                    onClick={() => download(draft, key)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloading === key ? "Opening…" : "Download"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Modal>
  );
}
