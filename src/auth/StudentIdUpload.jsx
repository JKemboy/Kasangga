import { ID_FIELDS } from "../services/studentIdOcr.js";
import { useEffect, useRef, useState } from "react";
import { primary } from "../components/tutor/workspace/ui.jsx";
import { idImageError, readStudentId } from "../services/studentIdOcr.js";

function Preview({ file, side }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url ? (
    <img
      src={url}
      alt={`${side} of uploaded student ID`}
      className="mt-2 h-28 w-full rounded border bg-slate-50 object-contain"
    />
  ) : null;
}

export default function StudentIdUpload({
  onFields,
  onReady,
  onBusy,
  onAttempted,
  onImage,
  allowEdit,
  onAllowEdit,
}) {
  const [files, setFiles] = useState({ front: null, back: null });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const controller = useRef(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      onReady(false);
      onBusy(false);
      onAttempted(false);
      onImage(null);
      onAllowEdit(false);
    },
    [onReady, onBusy, onAttempted, onImage, onAllowEdit],
  );
  function select(side, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const issue = idImageError(file);
    e.target.value = "";
    if (issue) {
      setError(issue);
      return;
    }
    setFiles((previous) => ({ ...previous, [side]: file }));
    if (side === "front") onImage(file);
    setResult(null);
    setProgress(null);
    setError("");
    onReady(false);
    onAttempted(false);
    onAllowEdit(false);
    onFields({});
  }
  async function extract() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    onBusy(true);
    onReady(false);
    onAttempted(false);
    onAllowEdit(false);
    setError("");
    setResult(null);
    try {
      const next = await readStudentId(files.front, files.back, {
        signal: abort.signal,
        onProgress: setProgress,
      });
      if (abort.signal.aborted) return;
      setResult(next);
      onFields(next.fields);
    } catch (e) {
      if (!abort.signal.aborted)
        setError(`Could not read the ID images: ${e.message}`);
    } finally {
      if (!abort.signal.aborted) {
        onAttempted(true);
        setBusy(false);
        onBusy(false);
      }
      controller.current = null;
    }
  }
  return (
    <section className="space-y-3 rounded-lg border border-green-200 bg-green-50/40 p-3">
      <h3 className="text-sm font-semibold">Student ID · Front and Back</h3>
      <p className="text-xs text-slate-600">
        Upload both sides separately, then select Extract ID Details. JPEG, PNG
        or WebP, up to 10 MB per image. OCR runs in your browser. The front
        image used for extraction is uploaded to your private account folder
        only when you save your profile.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {["front", "back"].map((side) => (
          <div key={side} className="rounded-lg border bg-white p-3">
            <label className="block text-xs font-semibold capitalize">
              ID {side}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => select(side, e)}
                className="mt-2 block w-full text-xs"
              />
            </label>
            <Preview file={files[side]} side={side} />
            {files[side] && (
              <p className="mt-1 truncate text-[10px] text-slate-500">
                {files[side].name}
              </p>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className={primary}
        disabled={busy || !files.front || !files.back}
        onClick={extract}
      >
        {busy ? "Reading ID images..." : "Extract ID Details"}
      </button>
      {busy && (
        <p role="status" className="text-xs">
          {progress?.side === "back" ? "Back" : "Front"}:{" "}
          {progress?.label || "Starting OCR"} ·{" "}
          {Math.round((progress?.progress || 0) * 100)}%
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      {result && (
        <div className="space-y-2">
          <p role="status" className="text-xs font-medium text-green-800">
            Extraction complete. The details below are read-only until you
            choose to edit them.
          </p>
          <dl className="grid gap-2 rounded border bg-white p-2 text-xs sm:grid-cols-2">
            {Object.entries(ID_FIELDS).map(([key, label]) => (
              <div key={key}>
                <dt className="font-semibold">{label}</dt>
                <dd
                  className={
                    result.fields[key] ? "text-slate-600" : "text-amber-700"
                  }
                >
                  {result.fields[key] || "Not detected"}
                </dd>
              </div>
            ))}
          </dl>
          {!result.academic && (
            <p role="status" className="text-xs text-amber-700">
              We couldn't confidently detect your college/program. Choose Allow
              Edit Details to select them from the dropdowns.
            </p>
          )}
          <p className="text-xs text-slate-600">
            OCR may miss unlabelled or unclear text. You can review and correct
            any mistakes after allowing edits. This does not verify the
            authenticity of your ID.
          </p>
          <button
            type="button"
            className={primary}
            disabled={allowEdit}
            onClick={() => onAllowEdit(true)}
          >
            {allowEdit ? "Editing Enabled" : "Allow Edit Details"}
          </button>
          {allowEdit && (
            <p role="status" className="text-xs text-green-800">
              You can now edit the extracted details in the fields below.
            </p>
          )}
        </div>
      )}
      {!result && !busy && error && (
        <>
          <p className="text-xs text-slate-600">
            You may correct or enter the ID details after this extraction
            attempt. You do not have to scan again if only a field was missed.
          </p>
          <button
            type="button"
            className={primary}
            disabled={allowEdit}
            onClick={() => onAllowEdit(true)}
          >
            {allowEdit ? "Editing Enabled" : "Allow Edit Details"}
          </button>
          {allowEdit && (
            <p role="status" className="text-xs text-green-800">
              You can now enter or correct your details in the fields below.
            </p>
          )}
        </>
      )}
    </section>
  );
}
