import ApplicationDecision from "./ApplicationDecision.jsx";
﻿import { useEffect, useRef, useState } from 'react';
import { X, FileText, Check, Save, RotateCcw } from 'lucide-react';
import { button, primary, input } from '../tutor/workspace/ui.jsx';
import { dateLabel } from './adminData.js';
import './application-review.css';

export default function ApplicationReview({ application: r, account, config, onSave, onClose }) {
  const ref = useRef(null);
  const [notes, setNotes] = useState(r.notes || '');
  const [message, setMessage] = useState('');
  const [decision, setDecision] = useState('');
  const final = ['Approved', 'Rejected'].includes(r.status);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  function save(status) {
    if (status && !notes.trim()) { setMessage('Enter review notes before recording a decision.'); return; }
    const next = { ...r, notes: notes.trim(), ...(status ? { status, history: [...(r.history || []), { from: r.status, to: status, reason: notes.trim(), at: new Date().toISOString(), by: 'Admin User' }] } : {}) };
    if (!onSave(next)) { setMessage('Could not save. Browser storage is unavailable or full.'); return; }
    setDecision('');
    setMessage(status ? 'Application review saved locally.' : 'Note saved locally.');
  }
  const pill = (value) => <span className={`au-status ${['Matched', 'Approved', 'Active'].includes(value) ? 'active' : 'restricted'}`}>{value}</span>;
  const facts = [['Application ID', r.id], ['Applicant', r.name], ['Student ID', r.studentId], ['CSU Email', r.email || account?.email], ['College', r.college], ['Program', r.program], ['Year Level', r.year], ['Submitted Date', dateLabel(r.date)], ['Application type', r.type || 'New Tutor'], ['Subject', r.subject], ['Current roles', account ? (account.tutor ? 'Learner, Tutor' : 'Learner') : null], ['Account status', account?.status]];
  return <dialog ref={ref} className="admin-application-review" aria-labelledby="application-review-title" onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <header><div><h2 id="application-review-title">{r.id} {pill(r.status)}</h2><p>{r.type || 'Tutor application'} · submitted {dateLabel(r.date)}</p></div><button className={button} aria-label="Close application review" onClick={onClose}><X size={16}/></button></header>
    <div className="aar-body">
      <dl className="aar-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl>
      <div className="aar-columns"><section>
        <h3>Documents</h3><div className="aar-document"><FileText size={24}/><div><strong>Supporting documents</strong><p>Document status: {r.documents}</p><small>Original files are not attached to this demo record.</small></div></div>
        <h3>OCR confidence</h3><div className="aar-meter"><div style={{width: `${Math.max(0, Math.min(100, r.confidence || 0))}%`}}/><i style={{left: `${config.threshold}%`}}/></div>
        <div className="aar-meter-label"><strong>{r.confidence}% · {r.confidence >= config.threshold ? 'at or above threshold' : 'below threshold'}</strong><span>Threshold: {config.threshold}%</span></div>
        <p className="aar-muted">Demo OCR metadata. Extraction confidence does not establish document authenticity.</p>
        <h3>Data / Regex match</h3><table><tbody>{[['Student ID format', /^\d{4}-\d{5}$/.test(r.studentId) ? 'Matched' : 'Not Matched'], ['CSU email domain', r.email || account?.email ? (/@carsu\.edu\.ph$/i.test(r.email || account.email) ? 'Matched' : 'Not Matched') : 'Unavailable'], ['Grade value', 'Unavailable'], ['Document dated within 12 months', 'Unavailable']].map(([label, result]) => <tr key={label}><td>{label}</td><td>{pill(result)}</td></tr>)}</tbody></table>
      </section><section>
        <h3>Extracted information vs student record</h3><table><thead><tr><th>Field</th><th>Extracted (OCR)</th><th>Record</th><th>Result</th></tr></thead><tbody>{[['Full name', r.name], ['Student ID', r.studentId], ['Program', r.program]].map(([label, value]) => <tr key={label}><td>{label}</td><td>Unavailable</td><td>{value}</td><td>Not evaluated</td></tr>)}</tbody></table>
        <p className="aar-match"><strong>Information Match (demo metadata)</strong>{pill(r.match)}</p>
        <label htmlFor="application-admin-notes"><strong>Admin Notes</strong></label><textarea id="application-admin-notes" className={input} placeholder="Internal notes for this review." rows={4} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} disabled={final}/>
        {!final && <button className={button} onClick={() => save()}><Save size={14}/>Save note</button>}
        {!!r.history?.length && <details><summary>Review history ({r.history.length})</summary>{r.history.map((item, i) => <p key={i}>{item.to}: {item.reason}</p>)}</details>}
      </section></div>
      {message && <p role="status">{message}</p>}

    </div>
    <footer>{final ? <p>Final local decision: {r.status}</p> : <><button className={`${button} text-red-600`} onClick={() => setDecision('Rejected')}><X size={14}/>Reject Application</button><div><button className={button} onClick={() => setDecision('Resubmission Required')}><RotateCcw size={14}/>Request Resubmission</button><button className={primary} onClick={() => setDecision('Approved')}><Check size={14}/>Approve Tutor</button></div></>}</footer>
    {decision && <ApplicationDecision key={decision} record={{...r, notes:notes.trim()}} decision={decision} onSave={next=>{if(!onSave(next))return false;setMessage('Application review saved locally.');return true;}} onClose={()=>setDecision('')} />}
  </dialog>;
}
