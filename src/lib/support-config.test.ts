import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupportConfig, normalizeSupportEmail } from './support-config';

const secrets = { RESEND_API_KEY: 're_test_key_123456789', RESEND_WEBHOOK_SECRET: `whsec_${Buffer.alloc(32, 7).toString('base64')}` };
const live = {
  ...secrets, SUPPORT_EMAIL_MODE: 'live', SUPPORT_FROM_EMAIL: 'support@example.com', SUPPORT_EMAIL_ADDRESS: 'support@example.com',
  SUPPORT_INBOUND_DOMAIN: 'replies.example.com', SUPPORT_APP_URL: 'https://shop.example.com',
};

test('defaults explicitly to development, including on production hosting', () => {
  const config = getSupportConfig({ ...secrets, NODE_ENV: 'production' });
  assert.equal(config.mode, 'development');
  assert.equal(config.fromEmail, 'onboarding@resend.dev');
  assert.equal(config.fromName, 'RareDaze Support');
  assert.equal(config.supportEmail, 'support@soliheleug.resend.app');
  assert.equal(config.testRecipient, 'dreamvault01@gmail.com');
  assert.equal(config.configured, true);
  assert.equal(config.webhookConfigured, true);
  assert.deepEqual(config.issues, []);
});

test('support sender names normalize legacy branding and preserve custom display names', () => {
  for (const [name, expected] of [
    ['', 'RareDaze Support'], ['   ', 'RareDaze Support'], ['DreamVault Support', 'RareDaze Support'],
    [' DreamVault ', 'RareDaze'], [' Custom Support ', 'Custom Support'],
    ['DreamVault Studio', 'DreamVault Studio'],
  ]) {
    const config = getSupportConfig({ ...secrets, SUPPORT_FROM_NAME: name });
    assert.equal(config.fromName, expected);
    assert.equal(config.configured, true);
    assert.equal(config.webhookConfigured, true);
  }
});

test('support sender normalization retains display name header validation', () => {
  for (const name of ['DreamVault Support\r\n', '\nDreamVault Support', 'Custom Support\r\nBcc: other@example.com', 'Custom <Support>', 'a'.repeat(101)]) {
    const config = getSupportConfig({ ...secrets, SUPPORT_FROM_NAME: name });
    assert.equal(config.configured, false);
    assert.equal(config.webhookConfigured, false);
    assert.ok(config.issues.some((issue) => issue.startsWith('SUPPORT_FROM_NAME')));
  }
});

test('missing credentials disable only their relevant capabilities', () => {
  assert.equal(getSupportConfig({}).configured, false);
  assert.equal(getSupportConfig({}).webhookConfigured, false);
  assert.equal(getSupportConfig({ RESEND_API_KEY: secrets.RESEND_API_KEY }).configured, true);
  assert.equal(getSupportConfig({ RESEND_API_KEY: secrets.RESEND_API_KEY }).webhookConfigured, false);
  assert.equal(getSupportConfig({ RESEND_WEBHOOK_SECRET: secrets.RESEND_WEBHOOK_SECRET }).webhookConfigured, true);
});

test('live mode fails closed until real sending/receiving addresses and public HTTPS are configured', () => {
  assert.equal(getSupportConfig({ ...secrets, SUPPORT_EMAIL_MODE: 'live' }).configured, false);
  assert.equal(getSupportConfig(live).configured, true);
  for (const override of [
    { SUPPORT_FROM_EMAIL: 'support@resend.dev' }, { SUPPORT_FROM_EMAIL: 'support@sub.resend.app' },
    { SUPPORT_EMAIL_ADDRESS: 'support@old.resend.app' }, { SUPPORT_INBOUND_DOMAIN: 'old.resend.app' },
    { SUPPORT_NOTIFICATION_EMAIL: 'notify@resend.dev' }, { SUPPORT_APP_URL: 'http://example.com' }, { SUPPORT_APP_URL: 'https://localhost' },
  ]) assert.equal(getSupportConfig({ ...live, ...override }).configured, false);
});

test('rejects invalid modes, header injection, display names in config, and unsafe base URLs', () => {
  for (const override of [
    { SUPPORT_EMAIL_MODE: 'production' }, { SUPPORT_FROM_EMAIL: 'sender@example.com\r\nBcc: other@example.com' },
    { SUPPORT_FROM_NAME: 'DreamVault\r\nSubject: fake' }, { SUPPORT_FROM_EMAIL: 'DreamVault <sender@example.com>' },
    { SUPPORT_INBOUND_DOMAIN: 'https://example.com' }, { SUPPORT_INBOUND_DOMAIN: 'mail..example.com' },
    { SUPPORT_APP_URL: 'https://user:secret@example.com' }, { SUPPORT_APP_URL: 'https://example.com/a?secret=true' },
    { SUPPORT_APP_URL: 'javascript:alert(1)' }, { SUPPORT_PREVIOUS_INBOUND_DOMAINS: 'old.example.com, @bad' },
    { SUPPORT_NOTIFICATION_EMAIL: 'different@example.com' },
  ]) assert.equal(getSupportConfig({ ...secrets, ...override }).configured, false);
});

test('normalizes a single mailbox but rejects combined addresses and injected headers', () => {
  assert.equal(normalizeSupportEmail(' Customer@Example.COM '), 'customer@example.com');
  assert.equal(normalizeSupportEmail('Customer Name <Customer@Example.COM>'), 'customer@example.com');
  assert.equal(normalizeSupportEmail('"Smith, Jane" <jane@example.com>'), 'jane@example.com');
  for (const value of ['one@example.com, two@example.com', 'one@example.com, Two <two@example.com>', 'a@localhost', 'a..b@example.com', 'x@example.com\n', 'a@-example.com', '<a@example.com><b@example.com>']) {
    assert.equal(normalizeSupportEmail(value), null);
  }
});

test('domain migration keeps explicitly allowed previous receiving domains', () => {
  const config = getSupportConfig({ ...live, SUPPORT_PREVIOUS_INBOUND_DOMAINS: 'soliheleug.resend.app, OLD.example.com,old.example.com' });
  assert.equal(config.configured, true);
  assert.deepEqual(config.previousInboundDomains, ['soliheleug.resend.app', 'old.example.com']);
});

test('validation issues identify settings without exposing key values', () => {
  const config = getSupportConfig({ RESEND_API_KEY: 'SECRET API KEY', RESEND_WEBHOOK_SECRET: 'SECRET SIGNING KEY' });
  assert.equal(config.configured, false);
  assert.equal(config.issues.join(' ').includes('SECRET API KEY'), false);
  assert.equal(config.issues.join(' ').includes('SECRET SIGNING KEY'), false);
});
