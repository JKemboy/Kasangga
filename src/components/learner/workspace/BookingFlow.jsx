import {useRef,useState} from 'react';
import {Field,button,primary,input} from '../../tutor/workspace/ui.jsx';
import {portalApi} from '../../../services/portalApi.js';

export default function BookingFlow({tutor,onComplete,onClose}){
 const [step,setStep]=useState(1),[draft,setDraft]=useState({service:'',topic:'',date:'',time:'',duration:'1.5',type:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
 const requestId=useRef(crypto.randomUUID());
 const services=tutor.services||String(tutor.subjects||'').split(',').filter(Boolean).map(s=>({name:s.trim(),topics:[]}));
 const selected=services.find(s=>s.name===draft.service);
 const change=(key,value)=>{setError('');setDraft(d=>({...d,[key]:value,...(key==='service'?{topic:''}:key==='date'||key==='duration'?{time:''}:{})}));};
 const total=(Number(tutor.rate)||Number(String(tutor.price||'').replace(/[^\d.]/g,''))||0)*Number(draft.duration);
 async function next(e){e.preventDefault();setError('');if(step===3&&new Date(`${draft.date}T${draft.time}:00+08:00`)<=new Date())return setError('Choose a future session time.');if(step<6){setStep(step+1);return;}setBusy(true);try{
   const confirmed=await portalApi('createBooking',{...draft,tutorId:tutor.id,tutor:tutor.name,idempotencyKey:requestId.current});
   if(!confirmed?.bookingId||confirmed.paymentStatus!=='Paid')throw new Error('Payment has not been confirmed. Your booking is not complete.');
   if(onComplete({...confirmed,...draft,name:tutor.name,lifecycle:'Upcoming',paymentStatus:'Paid'})===false)throw new Error('Booking response received but could not be saved locally. Keep the booking ID and retry syncing.');
   setResult(confirmed);setStep(7);
  }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <form className="space-y-3 text-sm" onSubmit={next} aria-busy={busy}>
  <p>{tutor.name}</p><p className="text-xs text-slate-500">{['','1. Select Service','2. Choose Topic','3. Date & Time','4. Session Type','5. Review Booking','6. Payment','Booking Confirmed'][step]}</p>
  {step===1&&<Field label="Service / Subject"><select className={input} value={draft.service} onChange={e=>change('service',e.target.value)} required><option value="">Select a service</option>{services.map(s=><option key={s.name}>{s.name}</option>)}</select></Field>}
  {step===2&&<Field label="Specific Topic">{selected?.topics?.length?<select className={input} required value={draft.topic} onChange={e=>change('topic',e.target.value)}><option value="">Choose a topic</option>{selected.topics.map(t=><option key={t}>{t}</option>)}</select>:<input className={input} required maxLength={200} value={draft.topic} onChange={e=>change('topic',e.target.value)}/>}</Field>}
  {step===3&&<><Field label="Date"><input className={input} type="date" min={new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Manila'})} required value={draft.date} onChange={e=>change('date',e.target.value)}/></Field><Field label="Duration"><select className={input} value={draft.duration} onChange={e=>change('duration',e.target.value)}>{[1,1.5,2].map(n=><option key={n} value={n}>{n} hours</option>)}</select></Field><Field label="Start Time"><input className={input} type="time" required min="07:00" max="19:00" step="1800" value={draft.time} onChange={e=>change('time',e.target.value)}/></Field><p className="text-xs">The booking service must verify tutor availability and prevent overlapping sessions before accepting this request.</p></>}
  {step===4&&<Field label="Session Type"><select className={input} required value={draft.type} onChange={e=>change('type',e.target.value)}><option value="">Choose a session type</option>{(tutor.types||['Online','In-person']).map(t=><option key={t}>{t}</option>)}</select></Field>}
  {step===5&&<><dl className="grid grid-cols-2 gap-2">{Object.entries(draft).map(([k,v])=><div key={k}><dt className="capitalize font-semibold">{k}</dt><dd>{v}</dd></div>)}</dl><p>Total: ₱{total.toFixed(2)}</p><label className="flex gap-2 text-xs"><input type="checkbox" required/>I have reviewed the session details and cancellation policy.</label></>}
  {step===6&&<><p>GCash via PayMongo · ₱{total.toFixed(2)}</p><p className="text-xs">Payment and booking are confirmed only by the connected service. Closing checkout does not create a paid booking.</p><label className="flex gap-2"><input type="radio" name="method" value="GCash" defaultChecked/>GCash</label></>}
  {step===7&&<><p>Booking ID: {result.bookingId}</p><p>Payment: {result.paymentStatus}</p><button type="button" className={primary} onClick={onClose}>Done</button></>}
  {error&&<p role="alert" className="rounded bg-red-50 p-2 text-red-700">{error}</p>}
  {step<7&&<div className="flex justify-end gap-2"><button type="button" disabled={busy} className={button} onClick={()=>step===1?onClose():setStep(step-1)}>{step===1?'Cancel':step===6?'Cancel Payment':'Back'}</button><button disabled={busy} className={primary}>{busy?'Processing…':step===5?'Proceed to Payment':step===6?'Continue to GCash':'Continue'}</button></div>}
 </form>;
}
