import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAdvanceSupportDelivery,
  normalizeRfcMessageId,
  SUPPORT_BODY_LIMIT,
  SUPPORT_TOKEN,
  SupportError,
  supportDeliveryEventStatus,
  supportEmailSubject,
  validateSupportBody,
  validateSupportId,
  validateSupportStatus,
} from './support-validation';
import { SUPPORT_STATUSES } from './support-types';

const REFERENCE = '8b8eb5f5-7928-405e-b7ce-0af6898fc821';

function invalidInput(error: unknown) {
  return error instanceof SupportError && error.status === 400;
}

test('valid UUID-v4 references are normalized to lower case', () => {
  assert.equal(validateSupportId(REFERENCE.toUpperCase()), REFERENCE);
});

test('references reject malformed values, other UUID versions, surrounding spaces, and unsafe path/header content', () => {
  for (const value of ['', ` ${REFERENCE}`, `${REFERENCE} `, REFERENCE.replace('-405e-', '-105e-'), REFERENCE.replace('-b7ce-', '-77ce-'), REFERENCE.replaceAll('-', ''), '../messages', `${REFERENCE}\r\nX-Test: injected`, `${REFERENCE}a`]) {
    assert.throws(() => validateSupportId(value), invalidInput, `Unexpectedly accepted ${value}`);
  }
});

test('reply tokens require exactly 48 lower-case hexadecimal characters', () => {
  assert.equal(SUPPORT_TOKEN.test('abcdef0123456789'.repeat(3)), true);
  for (const value of ['a'.repeat(47), 'a'.repeat(49), 'A'.repeat(48), 'g'.repeat(48), `${'a'.repeat(47)}\n`, '../ticket']) {
    assert.equal(SUPPORT_TOKEN.test(value), false);
  }
});

test('message validation preserves multiline literal text but trims outside whitespace', () => {
  const body = 'Hello <script>alert("literal text")</script>\nCan you help?\tThank you.';
  assert.deepEqual(validateSupportBody({ submissionId: REFERENCE.toUpperCase(), body: `  ${body}  ` }), {
    submissionId: REFERENCE,
    body,
  });
});

test('message validation enforces the inclusive body-length boundary', () => {
  assert.equal(validateSupportBody({ submissionId: REFERENCE, body: 'a'.repeat(SUPPORT_BODY_LIMIT) }).body.length, SUPPORT_BODY_LIMIT);
  assert.throws(() => validateSupportBody({ submissionId: REFERENCE, body: 'a'.repeat(SUPPORT_BODY_LIMIT + 1) }), invalidInput);
});

test('message validation rejects malformed payloads, empty messages, and missing/invalid submission IDs', () => {
  for (const value of [null, [], 12, 'message', {}, { submissionId: REFERENCE, body: '' }, { submissionId: REFERENCE, body: ' \n\t ' }, { submissionId: REFERENCE, body: 123 }, { body: 'Hello' }, { submissionId: '../ticket', body: 'Hello' }, { submissionId: 12, body: 'Hello' }]) {
    assert.throws(() => validateSupportBody(value), invalidInput);
  }
});

test('message validation rejects embedded control bytes while permitting ordinary newlines and tabs', () => {
  for (const code of [0, 1, 8, 11, 12, 14, 27, 31]) {
    assert.throws(() => validateSupportBody({ submissionId: REFERENCE, body: `First${String.fromCharCode(code)}second` }), invalidInput);
  }
  assert.equal(validateSupportBody({ submissionId: REFERENCE, body: 'First\r\nSecond\tcolumn' }).body, 'First\r\nSecond\tcolumn');
});

test('status validation permits only the exact supported conversation states', () => {
  for (const status of SUPPORT_STATUSES) assert.equal(validateSupportStatus(status), status);
  for (const value of [undefined, null, 0, [], 'READ', 'new', 'RESOLVED ', 'CLOSED', 'NEW\r\n']) {
    assert.throws(() => validateSupportStatus(value), invalidInput);
  }
});

test('outgoing subjects remove repeated reply prefixes and attach a stable short reference', () => {
  assert.equal(supportEmailSubject(' Re: re: RE: Delivery question ', REFERENCE), 'Re: Delivery question [DV-8B8EB5F5]');
  assert.equal(supportEmailSubject('  ', REFERENCE), 'Re: Your message [DV-8B8EB5F5]');
  assert.equal(supportEmailSubject('Re: Re: ', REFERENCE), 'Re: Your message [DV-8B8EB5F5]');
});

test('outgoing subjects cannot inject CRLF or null headers and have a bounded length', () => {
  const subject = supportEmailSubject('Question\r\nBcc: victim@example.com\0', REFERENCE);
  assert.doesNotMatch(subject, /[\r\n\x00]/);
  assert.match(subject, /^Re: /);
  assert.ok(supportEmailSubject('x'.repeat(10000), REFERENCE).length <= 160);
});

test('RFC message IDs are trimmed, validated, and length-limited before use in mail headers', () => {
  assert.equal(normalizeRfcMessageId('  <thread-123@mail.example.com>  '), '<thread-123@mail.example.com>');
  const maximum = `<${'a'.repeat(984)}@example.com>`;
  assert.equal(maximum.length, 998);
  assert.equal(normalizeRfcMessageId(maximum), maximum);
  for (const value of [undefined, null, 123, '', 'plain-id', 'a@example.com', '<a @example.com>', '<a@example.com> <b@example.com>', '<<a@example.com>>', '<a@example.com>\r\nBcc: victim@example.com', '<a@exa\0mple.com>', `<${'a'.repeat(985)}@example.com>`]) {
    assert.equal(normalizeRfcMessageId(value), null);
  }
});

test('RFC message IDs reject every C0 control and DEL before trimming or header use', () => {
  for (const code of [...Array.from({ length: 32 }, (_, index) => index), 127]) {
    const control = String.fromCharCode(code);
    for (const value of [`<thread${control}123@example.com>`, `<thread@exa${control}mple.com>`, `${control}<thread@example.com>`, `<thread@example.com>${control}`]) {
      assert.equal(normalizeRfcMessageId(value), null, `Accepted control byte ${code}`);
    }
  }
});

test('only supported provider events map to email delivery states', () => {
  const expected = {
    'email.sent': 'SENT',
    'email.delivered': 'DELIVERED',
    'email.bounced': 'BOUNCED',
    'email.complained': 'BOUNCED',
    'email.suppressed': 'BOUNCED',
    'email.failed': 'FAILED',
    'email.delivery_delayed': 'SENT',
  };
  for (const [event, state] of Object.entries(expected)) assert.equal(supportDeliveryEventStatus(event), state);
  for (const event of ['email.received', 'email.opened', 'email.clicked', '', 'EMAIL.SENT']) {
    assert.equal(supportDeliveryEventStatus(event), null);
  }
});

test('provider delivery mapping rejects inherited object and prototype property names', () => {
  for (const name of ['constructor', '__proto__', 'prototype', 'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable']) {
    assert.equal(supportDeliveryEventStatus(name), null, `Inherited name ${name} was treated as an event`);
  }
});

test('delivery advancement rejects older provider events regardless of current status', () => {
  const previousAt = new Date('2026-01-02T00:00:00Z');
  const olderAt = new Date('2026-01-01T23:59:59Z');
  for (const [current, next] of [['QUEUED', 'SENT'], ['SENT', 'DELIVERED'], ['DELIVERED', 'BOUNCED'], ['FAILED', 'BOUNCED']]) {
    assert.equal(canAdvanceSupportDelivery(current, next, previousAt, olderAt), false);
  }
});

test('delivery advancement permits chronological progress and initial updates', () => {
  const previousAt = new Date('2026-01-01T00:00:00Z');
  const nextAt = new Date('2026-01-02T00:00:00Z');
  assert.equal(canAdvanceSupportDelivery('QUEUED', 'SENT', null, nextAt), true);
  assert.equal(canAdvanceSupportDelivery('SENT', 'DELIVERED', previousAt, nextAt), true);
  assert.equal(canAdvanceSupportDelivery('SENT', 'BOUNCED', previousAt, nextAt), true);
  assert.equal(canAdvanceSupportDelivery('DELIVERED', 'BOUNCED', previousAt, nextAt), true);
  assert.equal(canAdvanceSupportDelivery('SENT', 'SENT', nextAt, nextAt), true);
});

test('delivered messages do not regress to sent/delayed or failed status', () => {
  const eventAt = new Date('2026-01-02T00:00:00Z');
  for (const next of ['SENT', 'FAILED']) {
    assert.equal(canAdvanceSupportDelivery('DELIVERED', next, null, eventAt), false);
  }
});

test('terminal delivery failures do not regress to sent or delivered status', () => {
  const eventAt = new Date('2026-01-02T00:00:00Z');
  for (const current of ['BOUNCED', 'BLOCKED', 'FAILED']) {
    for (const next of ['SENT', 'DELIVERED']) {
      assert.equal(canAdvanceSupportDelivery(current, next, null, eventAt), false, `${current} must not regress to ${next}`);
    }
  }
});
