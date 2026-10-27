import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from './route';

function request(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

test('rejects a submission from another browser origin', async () => {
  assert.equal((await POST(request('{}', { Origin: 'https://another-site.example' }))).status, 403);
});

test('rejects unsupported content types and malformed JSON', async () => {
  assert.equal((await POST(request('{}', { 'Content-Type': 'text/plain' }))).status, 415);
  assert.equal((await POST(request('{broken json'))).status, 400);
});

test('limits request size even without a Content-Length header', async () => {
  assert.equal((await POST(request('x'.repeat(32769)))).status, 413);
});

test('returns useful field errors before attempting a database operation', async () => {
  const response = await POST(request(JSON.stringify({ submissionId: '8b8eb5f5-7928-405e-b7ce-0af6898fc821', name: '', email: 'invalid', subject: '', message: '' })));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, undefined);
  assert.equal(typeof body.fieldErrors.email, 'string');
  assert.equal(typeof body.fieldErrors.message, 'string');
});
