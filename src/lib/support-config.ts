import 'server-only';

export interface SupportConfig {
  mode: 'development' | 'live';
  apiKey: string;
  webhookSecret: string;
  fromEmail: string;
  fromName: string;
  supportEmail: string;
  inboundDomain: string;
  previousInboundDomains: string[];
  testRecipient: string;
  notificationEmail: string;
  appUrl: string;
  configured: boolean;
  webhookConfigured: boolean;
  issues: string[];
}

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const LOCAL_PART = /^[a-z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/i;

/** One mailbox only; optional display names are discarded, never used as headers. */
export function normalizeSupportEmail(input: string): string | null {
  if (typeof input !== 'string' || CONTROL_CHARACTERS.test(input)) return null;
  let value = input.trim();
  if (value.includes('<') || value.includes('>')) {
    const match = /^(?:"[^"<>]*"|[^<>,@"]*)\s*<([^<>]+)>$/.exec(value);
    if (!match) return null;
    value = match[1].trim();
  }
  if (value.length > 254) return null;
  const pieces = value.split('@');
  if (pieces.length !== 2 || pieces[0].length > 64 || !LOCAL_PART.test(pieces[0]) || !DOMAIN.test(pieces[1])) return null;
  return value.toLowerCase();
}

function isReservedDomain(domain: string): boolean {
  return ['resend.dev', 'resend.app'].some((reserved) => domain === reserved || domain.endsWith(`.${reserved}`));
}

/** Server-only configuration. Never serialize this object into a client response. */
export function getSupportConfig(env: Readonly<Record<string, string | undefined>> = process.env): SupportConfig {
  const issues: string[] = [];
  const configuredMode = env.SUPPORT_EMAIL_MODE?.trim() || 'development';
  const mode = configuredMode === 'live' ? 'live' : 'development';
  if (!['development', 'live'].includes(configuredMode)) issues.push('SUPPORT_EMAIL_MODE must be development or live.');

  const readMailbox = (name: string, fallback: string): string => {
    const raw = env[name] ?? fallback;
    const normalized = normalizeSupportEmail(raw);
    // Config values must be bare addresses; display names have their own setting.
    if (!normalized || raw.includes('<') || raw.includes('>')) {
      issues.push(`${name} must contain one valid email address without a display name.`);
      return '';
    }
    return normalized;
  };
  const fromEmail = readMailbox('SUPPORT_FROM_EMAIL', 'onboarding@resend.dev');
  const supportEmail = readMailbox('SUPPORT_EMAIL_ADDRESS', 'support@soliheleug.resend.app');
  const testRecipient = readMailbox('SUPPORT_TEST_RECIPIENT', 'dreamvault01@gmail.com');
  const notificationEmail = readMailbox('SUPPORT_NOTIFICATION_EMAIL', testRecipient);
  if (mode === 'development' && notificationEmail !== testRecipient) issues.push('SUPPORT_NOTIFICATION_EMAIL must match SUPPORT_TEST_RECIPIENT in development mode.');
  const fromName = (env.SUPPORT_FROM_NAME ?? 'DreamVault Support').trim();
  if (!fromName || fromName.length > 100 || CONTROL_CHARACTERS.test(env.SUPPORT_FROM_NAME ?? '') || /[<>]/.test(fromName)) {
    issues.push('SUPPORT_FROM_NAME must be a plain display name of 1–100 characters.');
  }

  const inboundDomain = (env.SUPPORT_INBOUND_DOMAIN ?? 'soliheleug.resend.app').trim().toLowerCase();
  if (!DOMAIN.test(inboundDomain) || CONTROL_CHARACTERS.test(env.SUPPORT_INBOUND_DOMAIN ?? '')) issues.push('SUPPORT_INBOUND_DOMAIN must be a domain name, without @ or a URL.');
  const previousInboundDomains = [...new Set((env.SUPPORT_PREVIOUS_INBOUND_DOMAINS ?? '').split(',').map((domain) => domain.trim().toLowerCase()).filter(Boolean))];
  if (previousInboundDomains.some((domain) => !DOMAIN.test(domain)) || CONTROL_CHARACTERS.test(env.SUPPORT_PREVIOUS_INBOUND_DOMAINS ?? '')) {
    issues.push('SUPPORT_PREVIOUS_INBOUND_DOMAINS must be comma-separated domain names.');
  }

  let appUrl = (env.SUPPORT_APP_URL ?? 'http://localhost:3000').trim().replace(/\/+$/, '');
  try {
    const url = new URL(appUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/' || CONTROL_CHARACTERS.test(env.SUPPORT_APP_URL ?? '')) throw new Error();
    if (mode === 'live' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error();
    appUrl = url.toString().replace(/\/+$/, '');
  } catch {
    issues.push('SUPPORT_APP_URL must be an absolute website URL; live mode requires public HTTPS.');
  }

  if (mode === 'live') {
    for (const [name, address] of [['SUPPORT_FROM_EMAIL', fromEmail], ['SUPPORT_EMAIL_ADDRESS', supportEmail], ['SUPPORT_NOTIFICATION_EMAIL', notificationEmail]] as const) {
      if (address && isReservedDomain(address.split('@')[1])) issues.push(`${name} must use your own configured email address in live mode, not a Resend testing domain.`);
    }
    if (isReservedDomain(inboundDomain)) issues.push('SUPPORT_INBOUND_DOMAIN must use your verified receiving domain in live mode.');
  }

  const baseConfigValid = issues.length === 0;
  const apiKey = (env.RESEND_API_KEY ?? '').trim();
  const apiKeyValid = /^re_[a-zA-Z0-9_-]{8,}$/.test(apiKey) && !CONTROL_CHARACTERS.test(env.RESEND_API_KEY ?? '');
  if (!apiKeyValid) issues.push('RESEND_API_KEY is missing or invalid. Add it privately to server environment settings.');
  const webhookSecret = (env.RESEND_WEBHOOK_SECRET ?? '').trim();
  const webhookSecretValid = /^whsec_[a-zA-Z0-9+/=_-]{16,}$/.test(webhookSecret) && !CONTROL_CHARACTERS.test(env.RESEND_WEBHOOK_SECRET ?? '');
  if (!webhookSecretValid) issues.push('RESEND_WEBHOOK_SECRET is missing or invalid. Copy the signing secret from your Resend webhook.');

  return {
    mode, apiKey, webhookSecret, fromEmail, fromName, supportEmail, inboundDomain,
    previousInboundDomains, testRecipient, notificationEmail, appUrl,
    configured: baseConfigValid && apiKeyValid,
    webhookConfigured: baseConfigValid && webhookSecretValid,
    issues,
  };
}
