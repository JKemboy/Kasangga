import test from 'node:test';
import assert from 'node:assert/strict';
import { initialIncidents, reviewIncident, saveIncidents } from '../src/components/admin/incidentData.js';
test('technical resolution requires notes and records history without altering booking', () => {
 const r=initialIncidents[0];
 assert.throws(()=>reviewIncident(r,'Resolved by Admin','short'));
 const next=reviewIncident(r,'Resolved by Admin','Checked and repaired the meeting link.');
 assert.equal(next.status,'Resolved by Admin');
 assert.equal(next.booking,r.booking);
 assert.equal(next.history.length,1);
 assert.equal(r.history.length,0);
 assert.throws(()=>reviewIncident(next,'Resolved by Admin','Trying another resolution.'));
});
test('conduct reports cannot be resolved as technical issues and referral is recorded',()=>{
 const r=initialIncidents.find(r=>r.type==='Institutional Conduct' && r.status==='Pending Review');
 assert.throws(()=>reviewIncident(r,'Resolved by Admin','This is not a technical issue.'));
 const next=reviewIncident(r,'Referred to OSAS','Requires institutional assessment.');
 assert.equal(next.referral,'Referred to OSAS');
 assert.equal(next.status,'Admin Screening Complete');
});
test('storage failure is reported without claiming a saved review',()=>{
 const old=globalThis.localStorage;
 try { globalThis.localStorage={setItem(){throw new Error('full');}}; assert.equal(saveIncidents([]),false); }
 finally { if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old; }
});
