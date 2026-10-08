import {useState} from 'react';
import {Panel} from './UserDetails.jsx';
import {Modal,button,primary,input} from '../tutor/workspace/ui.jsx';
import BookingDetails,{paymentSplit} from './BookingDetails.jsx';
import {money,seed} from '../tutor/workspace/data.js';
import {dateLabel} from './adminData.js';
import {loadIncidents} from './incidentData.js';
import {paymentBookings,refundDecision} from './paymentDetailsData.js';
import './booking-details.css';
export default function PaymentDetails({record:r,onSave,onClose}){
 const [bookingOpen,setBookingOpen]=useState(false),[action,setAction]=useState(''),[note,setNote]=useState(''),[error,setError]=useState('');
 const [incidents]=useState(loadIncidents);
 const [workspace]=useState(()=>{return seed;});
 const booking=workspace.sessions.find(b=>b.booking===r.booking)||paymentBookings[r.booking];
 const split=paymentSplit(r.amount);const pending=r.payment==='Refund Review'&&!r.refundDecision;
 const paid=`${dateLabel(r.date)} · ${r.time}`;
 const badge=<span className={`au-status ${r.payment==='Paid'?'active':'restricted'}`}>{r.payment}</span>;
 function save(e){e.preventDefault();try{const next=refundDecision(r,action,note);if(!onSave(next))throw new Error('This action is not connected to the database yet. Nothing was saved.');setAction('');}catch(err){setError(err.message);}}
 return <Panel title={<>{r.id} {badge}</>} subtitle={`${r.method} · ${paid}`} onClose={onClose} footer={<><div className="ud-actions">{pending&&<><button className={`${button} text-red-600`} onClick={()=>{setAction('Declined');setNote('');setError('');}}>Decline Refund</button><button className={primary} onClick={()=>{setAction('Approved');setNote('');setError('');}}>Approve Refund</button></>}<button className={button} disabled={!booking} onClick={()=>setBookingOpen(true)}>Related Booking</button></div><button className={button} onClick={onClose}>Close</button></>}>
 <dl>{[['Transaction ID',r.id],['PayMongo reference',r.reference],['Booking ID',booking?<button className="abd-link" onClick={()=>setBookingOpen(true)}>{r.booking}</button>:r.booking],['Learner',r.learner],['Tutor',r.tutor],['Service',booking?.service||r.service],['Payment method',r.method],['Payment Status',badge],['Paid Date',paid]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Unavailable'}</dd></div>)}</dl>
 <h3>Allocation</h3>{split&&<><table className="abd-allocation"><tbody>{[['Gross Amount',split.gross],['Tutor (90%)',split.tutor],['OSAS (5%)',split.osas],['Platform (5%)',split.platform]].map(([label,value])=><tr key={label}><td>{label}</td><td>{money(value)}</td></tr>)}</tbody></table><p className="abd-muted">{money(split.gross)} = {money(split.tutor)} Tutor + {money(split.osas)} OSAS + {money(split.platform)} Platform. Shares are rounded to the centavo; the platform absorbs rounding.</p></>}
 {r.payment==='Refund Review'&&<section className="ud-status"><h3>Refund Request <span className="au-status restricted">{r.refundDecision?`${r.refundDecision.decision} (local)`:'Pending'}</span></h3><dl>{[['Requested',r.refundRequestedAt],['Amount',money(r.amount)],['Reason',r.refundReason],['Policy','Cancellation does not automatically guarantee a refund. Admin reviews the request.']].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||'Not recorded'}</dd></div>)}</dl>{r.refundDecision&&<p>Decision note: {r.refundDecision.note}</p>}<p className="abd-muted">Original allocation is a reference. No distribution or refund has been executed by this prototype.</p></section>}
 <p className="aid-info">Read-only payment reference. Local refund decisions do not send money through PayMongo, alter the booking, or notify the learner.</p>
 {action&&<Modal title={`${action==='Approved'?'Approve':'Decline'} Refund`} subtitle={`${r.id} · ${money(r.amount)} · ${r.learner}`} onClose={()=>setAction('')}><form className="ud-form" onSubmit={save}><p className="aid-info">{action==='Approved'?'Record approval for this refund request. Payment-provider processing is not connected; the booking remains unchanged.':'Record why this request does not meet refund policy. This does not change the provider payment status or execute an allocation.'}</p><label>Decision note (required)<textarea className={input} rows={4} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder={action==='Approved'?'Why the refund is granted under policy.':"Why the request does not meet refund policy."}/></label><small>{note.trim().length}/15 characters minimum · not connected to the database</small>{error&&<p role="alert">{error}</p>}<div className="ud-actions"><button type="button" className={button} onClick={()=>setAction('')}>Cancel</button><button className={primary} disabled={note.trim().length<15}>{action==='Approved'?'Approve':'Decline'} Refund</button></div></form></Modal>}
 {bookingOpen&&<BookingDetails record={{...booking,transaction:r.id,paymentMethod:r.method,payment:r.payment,paidAt:paid,reference:r.reference}} tutor={r.tutor} incidents={incidents} onClose={()=>setBookingOpen(false)}/>}
 </Panel>;
}
