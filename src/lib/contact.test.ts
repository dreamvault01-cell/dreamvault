import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContactSubmission } from './contact';

const valid = {
  submissionId: '8b8eb5f5-7928-405e-b7ce-0af6898fc821',
  name: 'Test Customer',
  email: 'customer@example.com',
  subject: 'A question about my print',
  message: 'Could you help me choose the right print size?',
  website: '',
};

test('trims contact fields and normalizes email without changing message content', () => {
  const result = validateContactSubmission({ ...valid, name: '  Test Customer  ', email: ' Customer@Example.COM ', message: '  First line\nSecond line  ' });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.name, 'Test Customer');
  assert.equal(result.data.email, 'customer@example.com');
  assert.equal(result.data.message, 'First line\nSecond line');
});

test('rejects malformed payload types', () => {
  for (const payload of [null, [], 'message', 42, {}]) {
    assert.equal(validateContactSubmission(payload).success, false);
  }
});

test('reports invalid fields instead of accepting whitespace or non-string values', () => {
  const result = validateContactSubmission({ ...valid, name: '  ', email: 'not-an-email', subject: 12, message: '\n  ' });
  assert.equal(result.success, false);
  if (result.success) return;
  assert.deepEqual(Object.keys(result.fieldErrors ?? {}).sort(), ['email', 'message', 'name', 'subject']);
});

test('enforces maximum lengths and rejects header-style newlines', () => {
  for (const change of [{ name: 'a'.repeat(101) }, { subject: 'a'.repeat(151) }, { message: 'a'.repeat(5001) }, { subject: 'Hello\r\nBcc: victim@example.com' }, { message: 'A valid message\0with a null byte' }]) {
    assert.equal(validateContactSubmission({ ...valid, ...change }).success, false);
  }
});

test('requires a valid submission reference and an empty honeypot', () => {
  assert.equal(validateContactSubmission({ ...valid, submissionId: '../some-file' }).success, false);
  assert.equal(validateContactSubmission({ ...valid, website: 'https://spam.example.com' }).success, false);
});

test('accepts international names, multiline messages, and literal punctuation', () => {
  assert.equal(validateContactSubmission({ ...valid, name: 'आर्या शर्मा', message: "I'd like a print of my family's artwork.\nCan you help?" }).success, true);
});
