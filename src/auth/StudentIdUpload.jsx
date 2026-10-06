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

export default function StudentIdUpload({ onFields, onReady, onBusy }) {
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
    },
    [onReady, onBusy],
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
    setResult(null);
    setError("");
    onReady(false);
  }
  async function extract() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    onBusy(true);
    onReady(false);
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
        setError(
          "Could not read the ID images. Try clearer photos, then extract again.",
        );
    } finally {
      if (!abort.signal.aborted) {
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
        or WebP, up to 10 MB per image. Images are read in your browser and are
        not stored on the server.
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
            Extraction complete. The four ID fields below have been updated.
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
                  {result.fields[key] || "Not detected - enter manually below"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-600">
            Review and correct the suggested fields below. OCR may miss
            unlabelled or unclear text; enter any missing values manually. This
            does not verify the authenticity of your ID.
          </p>
          {["front", "back"].map((side) => (
            <details key={side} className="rounded border bg-white p-2 text-xs">
              <summary className="cursor-pointer capitalize">
                Extracted text · {side}
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words font-sans">
                {result.texts[side] ||
                  "No readable text found. Try a clearer image or fill the fields manually."}
              </pre>
            </details>
          ))}
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="accent-green-800"
              onChange={(e) => onReady(e.target.checked)}
            />
            I have reviewed the extracted details and will correct any missing
            or inaccurate information before saving.
          </label>
        </div>
      )}
    </section>
  );
}
