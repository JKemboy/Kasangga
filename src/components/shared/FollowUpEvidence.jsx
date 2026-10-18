import EvidencePicker from "./EvidencePicker.jsx";
import { useRef, useState } from "react";
import { submitIncidentReport } from "../../services/incidentReports.js";
export default function FollowUpEvidence({ caseId }) {
  const key = useRef(crypto.randomUUID());
  const [files, setFiles] = useState([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  return (
    <form
      className="space-y-2 rounded border p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setMessage("");
        try {
          await submitIncidentReport({
            caseId,
            evidence: files,
            submissionKey: key.current,
          });
          setDone(true);
          setMessage("Follow-up evidence saved for OSAS review.");
        } catch (cause) {
          setMessage(cause.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>Submit requested evidence for CASE-{caseId}</p>
      {!done && (
        <>
          <EvidencePicker
            files={files}
            onChange={setFiles}
            onError={setMessage}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !files.length}
            className="rounded bg-green-800 px-3 py-2 text-white"
          >
            {busy ? "Saving evidence..." : "Submit Evidence"}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
