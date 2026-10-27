'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight, CircleAlert, Inbox, LoaderCircle, Mail, MessageSquare, Paperclip, RefreshCw, Search, Send, StickyNote } from 'lucide-react';
import type { SupportInboxResponse, SupportMessageView, SupportSettings, SupportStatus, SupportTicketDetail } from '@/lib/support-types';
import styles from './messages.module.css';

type ComposerMode = 'reply' | 'note';
type Draft = { reply: string; note: string };

const statusLabels: Record<SupportStatus, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In progress',
  WAITING_ON_CUSTOMER: 'Waiting for customer',
  RESOLVED: 'Resolved',
};
const deliveryLabels: Record<SupportMessageView['deliveryStatus'], string> = {
  RECEIVED: 'Received',
  QUEUED: 'Queued for sending',
  SENDING: 'Sending',
  SENT: 'Accepted by email service',
  DELIVERED: 'Delivered to recipient mail server',
  FAILED: 'Sending failed',
  BLOCKED: 'Sending blocked',
  BOUNCED: 'Email bounced',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `The request could not be completed (${response.status}).`);
  if (!data) throw new Error('The server returned an unreadable response. Please try again.');
  return data as T;
}

function dateLabel(value: string, full = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', ...(full ? { year: 'numeric', hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date);
}

function emailAllowed(settings: SupportSettings | undefined, email: string | undefined) {
  if (!settings?.configured || !email) return false;
  return settings.mode === 'live' || email.trim().toLowerCase() === settings.testRecipient.trim().toLowerCase();
}

function SettingsNotice({ settings }: { settings: SupportSettings }) {
  return (
    <section className={styles.settings} aria-label="Email configuration">
      <div className={styles.settingsHeading}>
        <span className={styles.mode} data-development={settings.mode === 'development'}>
          {settings.mode === 'development' ? 'Development mode' : 'Live email'}
        </span>
        <span>{settings.configured ? 'Email connection configured' : 'Email setup required'}</span>
      </div>
      <p>{settings.mode === 'development'
        ? 'Only your configured test inbox can receive outgoing emails. Messages from other customers are saved, but cannot be emailed in this mode.'
        : 'Customer replies are sent by email. Incoming replies appear here when the receiving webhook is connected.'}</p>
      <dl className={styles.addresses}>
        <div><dt>Sending from</dt><dd>{settings.fromEmail || 'Not configured'}</dd></div>
        <div><dt>Reply address</dt><dd>{settings.supportEmail || 'Not configured'}</dd></div>
        {settings.mode === 'development' && <div><dt>Test inbox only</dt><dd>{settings.testRecipient || 'Not configured'}</dd></div>}
      </dl>
      {(!settings.configured || !settings.webhookConfigured || settings.issues.length > 0) && (
        <details className={styles.setupDetails}>
          <summary>Configuration details</summary>
          <p>Add private email credentials to the server environment, then restart or redeploy. Never enter API keys in a message or share them with customers.</p>
          <p>Follow the project setup guide at <code>docs/SUPPORT_SETUP.md</code> for database, Vercel and Resend configuration.</p>
          <ul>{settings.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
          {!settings.webhookConfigured && <p>Incoming-reply verification is not configured. Complete the Resend webhook setup before testing replies.</p>}
        </details>
      )}
    </section>
  );
}

export default function SupportInbox() {
  const [inbox, setInbox] = useState<SupportInboxResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SupportStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [listVersion, setListVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [threadVersion, setThreadVersion] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [composerMode, setComposerMode] = useState<ComposerMode>('reply');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const selectedRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const submissions = useRef<Record<string, { body: string; id: string }>>({});
  const threadTitle = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('ticket')?.toLowerCase();
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) return;
    // Read email deep links after hydration; the server-rendered inbox stays unchanged.
    const timer = window.setTimeout(() => {
      selectedRef.current = id;
      pendingFocus.current = id;
      setSelectedId(id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setListLoading(true);
      setListError('');
      try {
        const params = new URLSearchParams({ q: query, status: filter, page: String(page) });
        const data = await request<SupportInboxResponse>(`/api/admin/messages?${params}`, { signal: controller.signal });
        if (!controller.signal.aborted) setInbox(data);
      } catch (error) {
        if (!controller.signal.aborted) setListError(error instanceof Error ? error.message : 'Unable to load messages.');
      } finally {
        if (!controller.signal.aborted) setListLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [query, filter, page, listVersion]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const load = async () => {
      setThreadLoading(true);
      setThreadError('');
      try {
        let data = await request<{ ticket: SupportTicketDetail }>(`/api/admin/messages/${selectedId}`, { signal: controller.signal });
        if (!controller.signal.aborted) setTicket(data.ticket);
        if (data.ticket.unread) {
          data = await request<{ ticket: SupportTicketDetail }>(`/api/admin/messages/${selectedId}`, {
            method: 'PATCH', body: JSON.stringify({ markRead: true }), signal: controller.signal,
          });
        }
        if (!controller.signal.aborted) {
          setTicket(data.ticket);
          setInbox((current) => current ? { ...current, tickets: current.tickets.map((item) => item.id === selectedId ? { ...item, unread: false } : item) } : current);
          if (pendingFocus.current === selectedId) {
            pendingFocus.current = null;
            window.requestAnimationFrame(() => threadTitle.current?.focus());
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) setThreadError(error instanceof Error ? error.message : 'Unable to load this conversation.');
      } finally {
        if (!controller.signal.aborted) setThreadLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [selectedId, threadVersion]);

  const refresh = useCallback(() => {
    setListVersion((value) => value + 1);
    setThreadVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !busyRef.current) refresh();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const activeTicket = ticket?.id === selectedId ? ticket : null;
  const draft = selectedId ? drafts[selectedId]?.[composerMode] || '' : '';
  const canSend = emailAllowed(inbox?.settings, activeTicket?.email);
  const blockedReason = !inbox?.settings.configured
    ? 'Email delivery is not configured. Complete the private server settings first. You can still add internal notes.'
    : !canSend ? `Development mode only allows email to ${inbox.settings.testRecipient || 'the configured test inbox'}. This customer will not be emailed or redirected to your test inbox.` : '';
  const pageCount = inbox ? Math.max(1, Math.ceil(inbox.total / inbox.pageSize)) : 1;

  function openTicket(id: string) {
    selectedRef.current = id;
    pendingFocus.current = id;
    setSelectedId(id);
    setThreadError('');
    setActionError('');
    setNotice('');
    setComposerMode('reply');
  }

  function closeTicket() {
    selectedRef.current = null;
    pendingFocus.current = null;
    setSelectedId(null);
    setActionError('');
    setNotice('');
  }

  async function mutate(path: string, body: unknown, label: string, method = 'POST') {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(label);
    setActionError('');
    setNotice('');
    try {
      const data = await request<{ ticket: SupportTicketDetail }>(path, { method, body: JSON.stringify(body) });
      if (data.ticket.id === selectedRef.current) {
        setTicket(data.ticket);
        setThreadVersion((value) => value + 1);
      }
      setListVersion((value) => value + 1);
      return data.ticket;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The change could not be saved. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTicket || busyRef.current || !draft.trim() || (composerMode === 'reply' && !canSend)) return;
    const id = activeTicket.id;
    const mode = composerMode;
    const body = draft.trim();
    const key = `${id}:${mode}`;
    if (submissions.current[key]?.body !== body) submissions.current[key] = { body, id: crypto.randomUUID() };
    const result = await mutate(`/api/admin/messages/${id}/${mode === 'reply' ? 'reply' : 'notes'}`, {
      submissionId: submissions.current[key].id, body,
    }, mode);
    if (!result) return;
    delete submissions.current[key];
    setDrafts((current) => ({ ...current, [id]: { reply: current[id]?.reply || '', note: current[id]?.note || '', [mode]: '' } }));
    if (selectedRef.current === id) setNotice(mode === 'note' ? 'Internal note saved. It was not emailed to the customer.' : 'Reply saved. Check its delivery status in the conversation; saving does not mean it has reached the customer.');
  }

  async function processOutbox() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy('process');
    setActionError('');
    setNotice('');
    try {
      const result = await request<{ processed: number; sent: number; failed: number; blocked: number }>('/api/admin/messages/process', { method: 'POST', body: '{}' });
      setNotice(`Outbox checked: ${result.processed} processed, ${result.sent} accepted by email service, ${result.failed} failed, ${result.blocked} blocked.`);
      refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to process the outbox.');
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>Customer care</p><h1>Messages</h1><p>Thoughtful support, one conversation at a time.</p></div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={refresh} disabled={listLoading || threadLoading || !!busy}><RefreshCw size={14} aria-hidden="true" /> Refresh</button>
          <button type="button" className={styles.secondaryButton} onClick={processOutbox} disabled={!!busy || !inbox?.settings.configured}><Send size={14} aria-hidden="true" /> {busy === 'process' ? 'Processing…' : 'Process outbox'}</button>
        </div>
      </header>

      {inbox && <SettingsNotice settings={inbox.settings} />}
      {actionError && <p role="alert" className={styles.error}><CircleAlert size={15} aria-hidden="true" />{actionError}</p>}
      {notice && <p role="status" className={styles.notice}><Check size={15} aria-hidden="true" />{notice}</p>}

      <div className={styles.workspace} data-thread-open={!!selectedId}>
        <section className={styles.inboxPanel} aria-label="Support inbox">
          <form className={styles.search} onSubmit={(event) => { event.preventDefault(); setQuery(searchInput.trim()); setPage(1); }} role="search">
            <label className={styles.srOnly} htmlFor="message-search">Search support messages</label>
            <Search size={16} aria-hidden="true" /><input id="message-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name, email or subject" maxLength={200} />
            <button type="submit">Search</button>
          </form>
          <div className={styles.filterRow}>
            <label className={styles.srOnly} htmlFor="message-status-filter">Filter by status</label>
            <select id="message-status-filter" value={filter} onChange={(event) => { setFilter(event.target.value as SupportStatus | 'ALL'); setPage(1); }}>
              <option value="ALL">All conversations</option>
              {(Object.keys(statusLabels) as SupportStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}{inbox ? ` (${inbox.counts[status]})` : ''}</option>)}
            </select>
            <span>{inbox ? `${inbox.total} ${inbox.total === 1 ? 'conversation' : 'conversations'}` : 'Loading…'}</span>
          </div>
          {listError && <div className={styles.panelError} role="alert"><p>{listError}</p><p>For initial setup, follow <code>docs/SUPPORT_SETUP.md</code> and apply the support database update before refreshing.</p><button type="button" onClick={refresh}>Try again</button></div>}
          <div className={styles.ticketList} aria-busy={listLoading}>
            {listLoading && !inbox && <div className={styles.empty}><LoaderCircle size={25} className={styles.spinner} aria-hidden="true" /><p>Loading your inbox…</p></div>}
            {!listLoading && inbox?.tickets.length === 0 && <div className={styles.empty}><Inbox size={28} aria-hidden="true" /><h2>{query || filter !== 'ALL' ? 'No matching conversations' : 'A little quiet for now'}</h2><p>{query || filter !== 'ALL' ? 'Try a different search or status.' : 'Contact form messages and incoming support emails will appear here.'}</p>{(query || filter !== 'ALL') && <button type="button" onClick={() => { setQuery(''); setSearchInput(''); setFilter('ALL'); setPage(1); }}>Clear filters</button>}</div>}
            {inbox?.tickets.map((item) => <button type="button" key={item.id} className={styles.ticket} data-selected={item.id === selectedId} data-unread={item.unread} aria-current={item.id === selectedId ? 'true' : undefined} onClick={() => openTicket(item.id)}>
              <span className={styles.ticketTop}><span className={styles.customerName}>{item.unread && <span className={styles.unreadDot} aria-label="Unread" />}{item.name || item.email}</span><time dateTime={item.lastMessageAt}>{dateLabel(item.lastMessageAt)}</time></span>
              <span className={styles.ticketSubject}>{item.subject || 'Support enquiry'}</span>
              <span className={styles.preview}>{item.preview || 'Open this conversation'}</span>
              <span className={styles.ticketBottom}><span className={styles.status} data-status={item.status}>{statusLabels[item.status]}</span>{item.hasDeliveryIssue ? <span className={styles.deliveryIssue}><CircleAlert size={12} aria-hidden="true" /> Delivery issue</span> : <span>{item.source === 'FORM' ? 'Contact form' : 'Email'}</span>}</span>
            </button>)}
          </div>
          <div className={styles.pagination}>
            <span>Page {page} of {pageCount}</span>
            <div><button type="button" aria-label="Previous page" disabled={page <= 1 || listLoading} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={17} aria-hidden="true" /></button><button type="button" aria-label="Next page" disabled={page >= pageCount || listLoading} onClick={() => setPage((value) => value + 1)}><ChevronRight size={17} aria-hidden="true" /></button></div>
          </div>
        </section>

        <section className={styles.threadPanel} aria-label="Conversation">
          {!selectedId ? <div className={styles.welcome}><MessageSquare size={30} strokeWidth={1.2} aria-hidden="true" /><p className={styles.eyebrow}>A personal touch</p><h2>Every conversation matters.</h2><p>Select a message to read its history,<br />leave a note or reply by email.</p><span>Refreshes every 30 seconds while this tab is visible.</span></div> : <>
            <button type="button" className={styles.mobileBack} onClick={closeTicket}><ArrowLeft size={15} aria-hidden="true" /> Back to inbox</button>
            {threadError && <div role="alert" className={styles.panelError}><p>{threadError}</p><button type="button" onClick={() => setThreadVersion((value) => value + 1)}>Try again</button></div>}
            {!activeTicket && !threadError && <div className={styles.empty}><LoaderCircle size={25} className={styles.spinner} aria-hidden="true" /><p>Opening conversation…</p></div>}
            {activeTicket && <>
              <header className={styles.threadHeader}>
                <div className={styles.threadMeta}><span>{activeTicket.source === 'FORM' ? 'Contact form' : 'Email enquiry'}</span><span>Ref {activeTicket.id.slice(0, 8).toUpperCase()}</span></div>
                <h2 ref={threadTitle} tabIndex={-1}>{activeTicket.subject || 'Support enquiry'}</h2>
                <p>{activeTicket.name} <span>{activeTicket.email}</span></p>
                <div className={styles.threadControls}><label htmlFor="conversation-status">Status</label><select id="conversation-status" value={activeTicket.status} disabled={!!busy} onChange={(event) => { void mutate(`/api/admin/messages/${activeTicket.id}`, { status: event.target.value }, 'status', 'PATCH'); }}>{(Object.keys(statusLabels) as SupportStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>{threadLoading && <span className={styles.syncing}>Refreshing…</span>}</div>
              </header>
              <div className={styles.messages} aria-busy={threadLoading}>
                {activeTicket.messages.map((message) => <article key={message.id} className={styles.message} data-direction={message.direction}>
                  <header><span>{message.direction === 'NOTE' ? <><StickyNote size={13} aria-hidden="true" /> Internal note</> : message.direction === 'INBOUND' ? <><Mail size={13} aria-hidden="true" /> {activeTicket.name || 'Customer'}</> : message.kind === 'ACKNOWLEDGEMENT' ? 'Automatic acknowledgement' : message.kind === 'NOTIFICATION' ? 'Team notification' : 'DreamVault support'}</span><time dateTime={message.createdAt}>{dateLabel(message.createdAt, true)}</time></header>
                  {(message.fromEmail || message.toEmail) && message.direction !== 'NOTE' && <p className={styles.messageAddress}>{message.fromEmail && <>From: {message.fromEmail}</>}{message.toEmail && <> · To: {message.toEmail}</>}</p>}
                  <p className={styles.messageBody}>{message.body}</p>
                  {!!message.attachments?.length && <div className={styles.attachments}><Paperclip size={13} aria-hidden="true" /><div><p>{message.attachments.length} attachment{message.attachments.length === 1 ? '' : 's'} received; downloads are not yet available.</p><ul>{message.attachments.map((attachment, index) => <li key={`${attachment.name}-${index}`}>{attachment.name || 'Unnamed attachment'}{attachment.size > 0 ? ` · ${Math.ceil(attachment.size / 1024)} KB` : ''}</li>)}</ul></div></div>}
                  {message.direction === 'OUTBOUND' && <footer className={styles.delivery} data-issue={['FAILED', 'BLOCKED', 'BOUNCED'].includes(message.deliveryStatus)}><span>{deliveryLabels[message.deliveryStatus]}</span>{message.lastError && <p>{message.lastError}</p>}{['FAILED', 'BLOCKED'].includes(message.deliveryStatus) && message.kind !== 'NOTIFICATION' && message.toEmail?.trim().toLowerCase() === activeTicket.email.trim().toLowerCase() && <button type="button" disabled={!!busy || !canSend} onClick={async () => { const result = await mutate(`/api/admin/messages/${activeTicket.id}/retry`, { messageId: message.id }, message.id); if (result) setNotice('Retry requested. Check the updated delivery status; delivery is not guaranteed.'); }}><RefreshCw size={12} aria-hidden="true" />Retry delivery</button>}</footer>}
                </article>)}
              </div>
              <form className={styles.composer} onSubmit={submitMessage}>
                <div className={styles.composerTabs} role="group" aria-label="Message type"><button type="button" aria-pressed={composerMode === 'reply'} disabled={!!busy} onClick={() => setComposerMode('reply')}><ArrowUpRight size={14} aria-hidden="true" />Email reply</button><button type="button" aria-pressed={composerMode === 'note'} disabled={!!busy} onClick={() => setComposerMode('note')}><StickyNote size={14} aria-hidden="true" />Internal note</button></div>
                <label className={styles.composerLabel} htmlFor="support-reply">{composerMode === 'note' ? 'Only your admin team can read this note.' : `Reply to ${activeTicket.email}`}</label>
                {composerMode === 'reply' && blockedReason && <p className={styles.blocked}><CircleAlert size={14} aria-hidden="true" />{blockedReason}</p>}
                <textarea id="support-reply" value={draft} rows={5} maxLength={5000} disabled={!!busy} onChange={(event) => { const value = event.target.value; setDrafts((current) => ({ ...current, [activeTicket.id]: { reply: current[activeTicket.id]?.reply || '', note: current[activeTicket.id]?.note || '', [composerMode]: value } })); }} placeholder={composerMode === 'note' ? 'Add useful context for your team…' : 'Write a thoughtful reply…'} required />
                <div className={styles.composerFooter}><span>{composerMode === 'note' ? 'Private · never emailed' : 'Plain-text email · no attachments'}<span>{draft.length.toLocaleString()} / 5,000</span></span><button type="submit" className={styles.primaryButton} disabled={!!busy || !draft.trim() || (composerMode === 'reply' && !canSend)}>{busy === composerMode ? <LoaderCircle size={14} className={styles.spinner} aria-hidden="true" /> : composerMode === 'note' ? <StickyNote size={14} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}{busy === composerMode ? 'Saving…' : composerMode === 'note' ? 'Save note' : 'Send reply'}</button></div>
              </form>
            </>}
          </>}
        </section>
      </div>
    </div>
  );
}
