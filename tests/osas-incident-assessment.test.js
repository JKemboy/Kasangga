import test from 'node:test';
import assert from 'node:assert/strict';
import {assessIncident,incidentSummary} from '../src/components/osas/incidentAssessment.js';
test('assessment creates a unique linked case or closes referral without a case',()=>{
 const r={id:'IR1',caseId:'',status:'Awaiting OSAS Assessment',referral:'Referred to OSAS'};
 assert.throws(()=>assessIncident(r,'close','short',[]),/10 characters/);
 const closed=assessIncident(r,'close','No institutional review is needed.',[]);
 assert.equal(closed.caseId,'');assert.equal(closed.status,'Closed / No Formal Case');
 assert.throws(()=>assessIncident(closed,'open','',[]),/not awaiting/);
 const year=new Date().getFullYear();const opened=assessIncident(r,'open','',[{caseId:`CASE-${year}-019`}]);
 assert.equal(opened.caseId,`CASE-${year}-020`);assert.equal(opened.formalCase.id,r.id);assert.equal(opened.formalCase.status,'Open');assert.equal(r.caseId,'');
 assert.throws(()=>assessIncident({...r,referral:'Not Referred'},'open','',[]),/not awaiting/);
 assert.match(incidentSummary([{...r,reporter:'<script>alert(1)</script>'}]),/&lt;script&gt;/);
});
