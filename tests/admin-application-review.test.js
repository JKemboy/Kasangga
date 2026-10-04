import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('application review shows selected record and manual document review', async () => {
  const server = await createServer({server:{middlewareMode:true},appType:'custom'});
  try {
    const {default:Review} = await server.ssrLoadModule('/src/components/admin/ApplicationReview.jsx');
    const {applications,configDefaults} = await server.ssrLoadModule('/tests/fixtures/adminData.js');
    const render = application => renderToStaticMarkup(createElement(Review,{application,config:configDefaults,onSave:()=>true,onClose:()=>{}}));
    const html = render(applications[0]);
    assert.match(html, /APP-2026-0132/);
    assert.match(html, /John Michael Perez/);
    assert.match(html, /Unavailable/);
    assert.doesNotMatch(html, /OCR|confidence|Extracted/);
    assert.match(html, /Approve Tutor/);
    assert.match(html, /Request Resubmission/);
    assert.match(html, /Reject Application/);
    assert.doesNotMatch(render({...applications[0],status:'Approved'}), /Approve Tutor|Reject Application|Save note/);
  } finally { await server.close(); }
});
