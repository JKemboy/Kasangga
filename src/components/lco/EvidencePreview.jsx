import { Panel } from "./UserDetails.jsx";
import { button } from "../tutor/workspace/ui.jsx";
import EvidenceFile from "../oswe/EvidenceFile.jsx";
export default function EvidencePreview({ record, onClose }) {
  return (
    <Panel
      title="Evidence attachments"
      subtitle={record.id}
      onClose={onClose}
      footer={
        <button className={button} onClick={onClose}>
          Close
        </button>
      }
    >
      {(record.evidence || []).map((e) => (
        <div key={e.id} className="rounded border p-3 mb-3">
          <strong>{e.name}</strong>
          <p>{e.type}</p>
          <EvidenceFile
            evidence={{
              filePath: e.path,
              fileName: e.name,
              evidenceType: e.type,
            }}
          />
        </div>
      ))}
      {!record.evidence?.length && <p>No evidence files recorded.</p>}
    </Panel>
  );
}
