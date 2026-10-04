import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('learner sessions renders an empty state without demo bookings', async () => {
 const server = await createServer({server:{middlewareMode:true},appType:'custom'});
 const previous = globalThis.localStorage;
 try {
  const {default:Page}=await server.ssrLoadModule('/src/components/learner/sessions/LearnerSessions.jsx');
  const {default:Workspace}=await server.ssrLoadModule('/src/components/learner/workspace/LearnerWorkspace.jsx');
  const {default:Interactions}=await server.ssrLoadModule('/src/components/shared/InteractionProvider.jsx');
  const render=()=>renderToStaticMarkup(createElement(Interactions,null,createElement(Workspace,{go:()=>{}},createElement(Page))));
  globalThis.localStorage={getItem:()=>null};
  let html=render();
  assert.match(html, /No upcoming sessions yet/);
  assert.doesNotMatch(html, /BK-2026-/);
 } finally {
  if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;
  await server.close();
 }
});
