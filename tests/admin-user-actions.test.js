import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
test('user actions validate suspension and retain roles and audit history',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try {
  const {changeUserStatus}=await server.ssrLoadModule('/src/components/admin/UserDetails.jsx');
  const user={id:'1',status:'Restricted',tutor:true,history:[]};
  assert.throws(()=>changeUserStatus(user,'Suspend User',{}));
  const suspended=changeUserStatus(user,'Suspend User',{category:'Account security',reason:'Repeated account sharing detected.',reviewDate:'2026-10-07',ack:true});
  assert.equal(suspended.status,'Suspended');assert.equal(suspended.tutor,true);assert.equal(suspended.history.length,1);
  const active=changeUserStatus(suspended,'Reactivate User');
  assert.equal(active.status,'Active');assert.equal(active.tutor,true);assert.equal(active.history.length,2);assert.equal(user.history.length,0);
  assert.equal(changeUserStatus(user,'Lift Restriction').status,'Active');
  assert.throws(()=>changeUserStatus(active,'Reactivate User'));
 }finally{await server.close();}
});
