import {hour, slotError} from './data.js';

export function sessionAction(data, id, action, values, now = new Date().toISOString()) {
  const session = data.sessions.find(s => s.id === id);
  if (!session) throw new Error('This session is no longer available.');
  const active = ['Confirmed', 'Pending'].includes(session.status);
  const reason = String(values.reason || '').trim();
  if (!reason) throw new Error('Enter a reason before continuing.');
  if (action !== 'incident' && !active) throw new Error('Only upcoming sessions can be changed.');
  let changed = {...session};
  let reports = data.reports;
  if (action === 'cancel') {
    if (!values.acknowledged) throw new Error('Acknowledge the cancellation policy.');
    changed = {...changed, status:'Cancelled', payment: session.payment === 'Paid' ? 'Refund Under Review' : 'Not charged', cancellation:{by:'Tutor',reason,at:now}, reschedule:null};
  } else if (action === 'reschedule') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date || '') || !/^\d{2}:\d{2}$/.test(values.time || '')) throw new Error('Choose a date and time.');
    if (new Date(`${values.date}T${values.time}:00+08:00`).getTime() <= new Date(now).getTime()) throw new Error('Choose a future date and time.');
    const duration = hour(session.end) - hour(session.start);
    const start = hour(values.time), end = start + duration;
    const conflict = slotError({date:values.date,day:(new Date(`${values.date}T12:00:00`).getDay()+6)%7,start,end,type:session.type,repeat:false}, [], data.sessions.filter(s=>s.id!==id));
    if (conflict) throw new Error(conflict);
    const free = data.slots.some(slot => (slot.repeat ? new Date(`${slot.date}T12:00:00`).getDay() === new Date(`${values.date}T12:00:00`).getDay() : slot.date === values.date) && Number(slot.start)<=start && Number(slot.end)>=end && (!slot.kind || slot.kind==='available') && (slot.type==='Both'||slot.type===session.type));
    if (!free) throw new Error('Choose a time within your available tutoring slots.');
    changed.reschedule = {date:values.date,start:values.time,end,reason,by:'Tutor',status:'Pending',at:now};
  } else if (action === 'incident') {
    if (!values.incidentType) throw new Error('Select the incident type.');
    if (reason.length < 20) throw new Error('Describe the incident in at least 20 characters.');
    const report = {id:crypto.randomUUID(),session:id,type:values.incidentType,description:reason,files:values.files||[],created:now,status:'Submitted locally'};
    reports = [...reports,report]; changed.report = report;
  } else throw new Error('Unknown session action.');
  return {...data, reports, sessions:data.sessions.map(s=>s.id===id?changed:s)};
}

export function meetingUrl(value) {
  try { const url = new URL(value?.startsWith('https://') ? value : `https://${value}`); return url.protocol === 'https:' && ['meet.google.com','zoom.us','www.zoom.us'].some(host=>url.hostname===host||url.hostname.endsWith(`.${host}`)) ? url.href : null; } catch { return null; }
}
