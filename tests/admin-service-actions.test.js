import test from 'node:test';
import assert from 'node:assert/strict';
import {moderateService,serviceCsv} from '../src/components/admin/serviceActions.js';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
test('moderation preserves content and validates suspension and requests',()=>{
 const s={status:'Active',description:'Tutor content',rate:350,history:[]};
 assert.throws(()=>moderateService(s,'Suspend Service','A valid reason for suspension.',[],false));
 assert.throws(()=>moderateService(s,'Request Changes','short',['Title']));
 const request=moderateService(s,'Request Changes','Please clarify the lesson title.',['Title']);
 assert.equal(request.status,'Active');assert.equal(request.description,s.description);
 const suspended=moderateService(s,'Suspend Service','Listing violates location policy.',[],true);
 assert.equal(suspended.status,'Suspended');assert.equal(suspended.rate,350);assert.equal(s.history.length,0);
 assert.equal(moderateService(suspended,'Lift Suspension').status,'Active');
 assert.throws(()=>moderateService(s,'Lift Suspension'));
});
test('service CSV quotes fields and guards spreadsheet formulas',()=>{
 const csv=serviceCsv([{id:'1',title:'=SUM(1,2)',tutor:'Name "One"'}]);
 assert.match(csv,/'=SUM/);assert.match(csv,/Name ""One""/);
});
test('service summary and details render service fields',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try {
 const {summaryHtml}=await server.ssrLoadModule('/src/components/admin/UserExport.jsx');
 const {default:Details}=await server.ssrLoadModule('/src/components/admin/ServiceDetails.jsx');
 const s={id:'SRV-1',title:'Calculus',tutor:'Tutor One',status:'Active',subject:'Math',rate:350,date:'2026-09-01'};
 assert.match(summaryHtml([s],'services'),/Service Summary/);
 assert.match(summaryHtml([s],'services'),/Tutor One/);
 const html=renderToStaticMarkup(createElement(Details,{service:s,onSave:()=>true,onClose:()=>{}}));
 assert.match(html,/Suspend Service/);assert.match(html,/Request Changes/);
 }finally{await server.close();}
});
