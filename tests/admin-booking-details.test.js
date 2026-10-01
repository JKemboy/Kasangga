import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
test('booking details preserve separate statuses and transaction allocation balances', async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try {
  const {default:Details,paymentSplit}=await server.ssrLoadModule('/src/components/admin/BookingDetails.jsx');
  assert.deepEqual(paymentSplit(350),{gross:350,tutor:315,osas:17.5,platform:17.5});
  const split=paymentSplit(350.17);
  assert.equal(Math.round((split.tutor+split.osas+split.platform)*100),35017);
  assert.equal(paymentSplit(-1),null);
  const record={id:'bk-1',learner:'Learner',service:'Calculus',date:'2026-09-17',start:'09:00',end:'10:00',amount:350,status:'Cancelled',payment:'Paid'};
  const html=renderToStaticMarkup(createElement(Details,{record,tutor:'Tutor',onClose:()=>{}}));
  assert.match(html,/Cancelled/);assert.match(html,/Paid/);assert.match(html,/disabled=""[^>]*>.*?Related Transaction/s);
  assert.match(html,/1 hour/);assert.match(html,/No linked incident reports/);
 } finally {await server.close();}
});
