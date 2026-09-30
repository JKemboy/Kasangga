import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('learner sessions renders payment filters and current payment badges', async () => {
 const server = await createServer({server:{middlewareMode:true},appType:'custom'});
 const previous = globalThis.localStorage;
 try {
  const {default:Page}=await server.ssrLoadModule('/src/components/learner/sessions/LearnerSessions.jsx');
  const {default:Workspace}=await server.ssrLoadModule('/src/components/learner/workspace/LearnerWorkspace.jsx');
  const {default:Interactions}=await server.ssrLoadModule('/src/components/shared/InteractionProvider.jsx');
  const render=()=>renderToStaticMarkup(createElement(Interactions,null,createElement(Workspace,{go:()=>{}},createElement(Page))));
  globalThis.localStorage={getItem:()=>null};
  let html=render();
  assert.match(html, /<option value="Paid">Paid<\/option>/);
  assert.match(html, /<option value="Pending">Pending<\/option>/);
  globalThis.localStorage={getItem:()=>JSON.stringify({sessions:[{id:1,paymentStatus:'Refund Under Review'}]})};
  html=render();
  assert.match(html, /<option value="Refund Under Review">Refund Under Review<\/option>/);
  assert.match(html, /<span[^>]*>Refund Under Review<\/span>/);
 } finally {
  if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;
  await server.close();
 }
});
