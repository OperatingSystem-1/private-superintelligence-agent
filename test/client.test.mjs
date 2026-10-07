import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrivateSuperIntelligence, PrivateSuperIntelligenceError } from '../dist/index.js';

function mock(responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    const [status, body, headers = {}] = responses.shift();
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
  };
  return { calls, fetch };
}

test('reads the definition from the public API', async () => {
  const { calls, fetch } = mock([[200, { term: 'Private superintelligence', text: 'AI for one owner.', url: 'https://privatesuperintelligence.si/what-is-private-superintelligence/' }]]);
  const definition = await new PrivateSuperIntelligence({ fetch }).definition();
  assert.equal(definition.term, 'Private superintelligence');
  assert.equal(calls[0].url, 'https://privatesuperintelligence.si/api/v1/definition');
});

test('encodes search queries and sends a limit', async () => {
  const { calls, fetch } = mock([[200, { query: 'zero retention', count: 0, results: [] }]]);
  await new PrivateSuperIntelligence({ fetch, baseUrl: 'http://localhost:8788/api/v1/' }).search('zero retention', 3);
  assert.equal(calls[0].url, 'http://localhost:8788/api/v1/search?q=zero%20retention&limit=3');
});

test('registration sends JSON with an idempotency key', async () => {
  const { calls, fetch } = mock([[201, { registered: true, message: 'Interest registered.' }]]);
  const input = { email: 'cio@example.com', jobTitle: 'CIO', annualRevenueBand: '250m-1b', userConfirmed: true };
  const result = await new PrivateSuperIntelligence({ fetch }).registerInterest(input, { idempotencyKey: 'key-12345678' });
  assert.equal(result.registered, true);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['Idempotency-Key'], 'key-12345678');
  assert.deepEqual(JSON.parse(calls[0].init.body), input);
});

test('problem responses become typed errors with hints and retry timing', async () => {
  const { fetch } = mock([[429, { code: 'rate_limited', detail: 'Too many registrations.', hint: 'Wait an hour.' }, { 'retry-after': '3600' }]]);
  await assert.rejects(new PrivateSuperIntelligence({ fetch }).registerInterest({ email: 'a@b.co', jobTitle: 'x', annualRevenueBand: '5b-plus', userConfirmed: true }),
    (error) => error instanceof PrivateSuperIntelligenceError && error.code === 'rate_limited' && error.hint === 'Wait an hour.' && error.retryAfter === 3600);
});
