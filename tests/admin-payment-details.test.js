import test from 'node:test';
import assert from 'node:assert/strict';
import {refundDecision,paymentBookings} from './fixtures/paymentData.js';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
test('refund decisions preserve payment and booking state and reject repeat decisions',()=>{
 const r={id:'TXN-1',payment:'Refund Review',status:'Cancelled',amount:350};
 assert.throws(()=>refundDecision(r,'Approved','short'));
 for(const action of ['Approved','Declined']){const next=refundDecision(r,action,'Reviewed the refund request and policy.');assert.equal(next.payment,'Refund Review');assert.equal(next.status,'Cancelled');assert.equal(next.amount,350);assert.equal(next.refundDecision.decision,action);assert.throws(()=>refundDecision(next,action,'Another reason for the same refund.'));}
 assert.throws(()=>refundDecision({...r,payment:'Paid'},'Approved','Reviewed the refund request and policy.'));
 assert.equal(paymentBookings['BK-2026-1831'].status,'Cancelled');
});
test('payment details and export summary show transaction fields',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try {
 const {default:Details}=await server.ssrLoadModule('/src/components/admin/PaymentDetails.jsx');
 const {summaryHtml}=await server.ssrLoadModule('/src/components/admin/UserExport.jsx');
 const r={id:'TXN-2026-0916-1831',booking:'BK-2026-1831',learner:'Mark',tutor:'Tutor',amount:350,payment:'Refund Review',date:'2026-09-16',time:'09:22',method:'GCash via PayMongo'};
 const html=renderToStaticMarkup(createElement(Details,{record:r,onSave:()=>true,onClose:()=>{}}));
 assert.match(html,/Approve Refund/);assert.match(html,/Decline Refund/);assert.match(html,/Related Booking/);
 const summary=summaryHtml([r],'payments');assert.match(summary,/Transaction Summary/);assert.match(summary,/Refund Review: 1/);assert.match(summary,/GCash via PayMongo/);
 }finally{await server.close();}
});
