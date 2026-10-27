// Safe, serializable inbox DTOs. Never put credentials or reply tokens here.
export const SUPPORT_STATUSES = ['NEW', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED'] as const;
export type SupportStatus = typeof SUPPORT_STATUSES[number];
export type SupportDeliveryStatus = 'RECEIVED' | 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BLOCKED' | 'BOUNCED';
export type SupportDirection = 'INBOUND' | 'OUTBOUND' | 'NOTE';
export type SupportMessageKind = 'CUSTOMER' | 'REPLY' | 'ACKNOWLEDGEMENT' | 'NOTIFICATION' | 'NOTE';

export interface SupportAttachment {
  name: string;
  contentType: string;
  size: number;
}

export interface SupportMessageView {
  id: string;
  direction: SupportDirection;
  kind: SupportMessageKind;
  body: string;
  fromEmail: string | null;
  toEmail: string | null;
  createdAt: string;
  deliveryStatus: SupportDeliveryStatus;
  attempts: number;
  lastError: string | null;
  attachments: SupportAttachment[];
}

export interface SupportTicketSummary {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  source: 'FORM' | 'EMAIL';
  unread: boolean;
  preview: string;
  replyCount: number;
  hasDeliveryIssue: boolean;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  messages: SupportMessageView[];
}

export interface SupportSettings {
  mode: 'development' | 'live';
  fromEmail: string;
  supportEmail: string;
  inboundDomain: string;
  testRecipient: string;
  notificationEmail: string;
  configured: boolean;
  webhookConfigured: boolean;
  issues: string[];
}

export interface SupportInboxResponse {
  tickets: SupportTicketSummary[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<SupportStatus, number>;
  settings: SupportSettings;
}
