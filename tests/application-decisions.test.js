import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
test('verification decisions validate acknowledgement and applicant instructions',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try {
 const {applicationDecision:decide}=await server.ssrLoadModule('/src/components/admin/ApplicationDecision.jsx');
 const r={status:'Pending',notes:'Internal note',history:[]};
 assert.throws(()=>decide(r,'Approved','',[],false));
 assert.equal(decide(r,'Approved','',[],true).status,'Approved');
 assert.throws(()=>decide(r,'Rejected','short',[],false));
 assert.throws(()=>decide(r,'Resubmission Required','Please upload all missing pages.',[],false));
 const next=decide(r,'Resubmission Required','Please upload all missing pages.',['Complete pages'],false);
 assert.deepEqual(next.history[0].requestedChanges,['Complete pages']);
 assert.equal(next.notes,'Internal note');assert.equal(r.history.length,0);
 assert.equal(decide(r,'Rejected','Required documentation was not provided.',[],false).status,'Rejected');
 assert.throws(()=>decide({...r,status:'Approved'},'Rejected','Required documentation was not provided.',[],false));
 }finally{await server.close();}
});
