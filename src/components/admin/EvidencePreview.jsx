import {Panel} from './UserDetails.jsx';
import {button} from '../tutor/workspace/ui.jsx';
export const sampleEvidence = {
 'IR-2026-0142': {name:'meet_error_0917.png',title:'Screenshot',text:"You cannot join this video call",detail:'meet.google.com/xyz-abcd-efg · Sep 17, 2026, 9:02 AM'},
 'IR-2026-0141': {name:'reporter_statement.pdf',title:'Written statement',text:'The reporter alleges inappropriate remarks during the in-person session.',detail:'Allegation as submitted; not a finding of misconduct.'}
};
export default function EvidencePreview({record,onClose}){
 const evidence=sampleEvidence[record.id];
 return <Panel title="Evidence Preview" subtitle={`${record.id} · ${evidence?.name || 'No attachment'}`} onClose={onClose} footer={<button className={button} onClick={onClose}>Close</button>}><p className="text-xs text-slate-500 mb-3">Illustrative demo preview based on the supplied design. Original evidence file is not attached.</p><div className="rounded-xl border bg-slate-50 p-4 min-h-64">{evidence?<div className={`rounded-lg p-10 text-center ${record.id==='IR-2026-0142'?'bg-zinc-900 text-white':'bg-white text-slate-800'}`}><strong>{evidence.text}</strong><p className="mt-3 text-xs">{evidence.detail}</p></div>:<p>No evidence is available for this record.</p>}</div></Panel>;
}
