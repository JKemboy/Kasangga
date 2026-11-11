import { useEffect, useState } from "react";
import { incidentEvidenceUrl } from "../../services/incidentReports.js";
import { completionProofUrl } from "../../services/tutorSessionCompletion.js";
export default function EvidenceFile({ evidence, readOnly = false }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setUrl("");
    setError("");
    if (evidence?.filePath)
      (evidence.storageBucket === "session-completion-proofs"
        ? completionProofUrl
        : incidentEvidenceUrl)(evidence.filePath)
        .then((value) => {
          if (active) setUrl(value);
        })
        .catch((cause) => {
          if (active) setError(cause.message);
        });
    return () => {
      active = false;
    };
  }, [evidence?.filePath, evidence?.storageBucket]);
  if (error) return <p role="alert">Unable to open evidence: {error}</p>;
  if (!evidence?.filePath) return <p>No original file is attached.</p>;
  if (!url) return <p role="status">Loading private evidence...</p>;
  return (
    <div>
      {!readOnly && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open original: {evidence.fileName}
        </a>
      )}
      {evidence.evidenceType?.startsWith("image/") ? (
        <img
          src={url}
          alt={evidence.fileName}
          style={{ maxWidth: "100%", maxHeight: 450 }}
        />
      ) : evidence.evidenceType?.startsWith("video/") ? (
        <video
          controls
          preload="metadata"
          src={url}
          style={{ width: "100%", maxHeight: 450 }}
        >
          Your browser cannot play this video. Use Open original to download it.
        </video>
      ) : (
        <iframe
          src={url}
          title={evidence.fileName}
          style={{ width: "100%", height: 400 }}
        />
      )}
    </div>
  );
}
