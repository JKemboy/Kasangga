import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('earnings opens details only for an explicit valid transaction target', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: Earnings } = await server.ssrLoadModule('/src/components/tutor/workspace/Earnings.jsx');
    const { seed } = await server.ssrLoadModule('/tests/fixtures/tutorData.js');
    const data = { ...seed, sessions: [{ ...seed.sessions[0], transaction: undefined }, ...seed.sessions] };
    const render = (args) => renderToStaticMarkup(createElement(Earnings, { data, args, go: () => {} }));
    assert.doesNotMatch(render(undefined), /Transaction Details/);
    assert.doesNotMatch(render({}), /Transaction Details/);
    assert.doesNotMatch(render({ transactionId: 'missing' }), /Transaction Details/);
    const transactionId = seed.sessions.find((session) => session.transaction).transaction;
    assert.match(render({ transactionId }), /Transaction Details/);
  } finally {
    await server.close();
  }
});
